import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { CreateCustomerSchema, validateInput } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - List all customers for a shop
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.customers.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    routeLogger.debug('Token verified', { shopId: decoded.shopId })

    const result = await query(
      `SELECT
        cp.id,
        cp.email,
        cp.name,
        cp.phone,
        cp.preferred_barber_id,
        COUNT(a.id) as total_appointments,
        MAX(a.start_time) as last_visit_date
      FROM customer_profiles cp
      LEFT JOIN appointments a ON cp.id = a.customer_id
      WHERE cp.shop_id = $1
      GROUP BY cp.id, cp.email, cp.name, cp.phone, cp.preferred_barber_id
      ORDER BY last_visit_date DESC NULLS LAST`,
      [decoded.shopId]
    )

    routeLogger.debug('Customers fetched', { count: result.rows.length })
    return NextResponse.json({ success: true, customers: result.rows })
  } catch (error) {
    routeLogger.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// POST - Create new customer profile
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.customers.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateCustomerSchema, body, 'customers.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { email, name, phone, address } = validation.data!
    routeLogger.debug('Creating customer', { shopId: decoded.shopId, email })

    const result = await query(
      `INSERT INTO customer_profiles (shop_id, email, name, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [decoded.shopId, email, name, phone || null, address || null]
    )

    routeLogger.info('Customer created successfully', { customerId: result.rows[0].id, email })
    return NextResponse.json({ success: true, customer: result.rows[0] })
  } catch (error: any) {
    if (error.code === '23505') {
      routeLogger.warn('Customer email already exists', { error: error.message })
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      )
    }
    routeLogger.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
