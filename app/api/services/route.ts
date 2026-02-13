import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { CreateServiceSchema, validateInput } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - List all services for the shop
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.services.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    routeLogger.debug('Token verified', { shopId: decoded.shopId })

    const result = await query(
      `SELECT 
        id, 
        name, 
        description, 
        base_price, 
        duration_minutes, 
        category,
        active,
        created_at 
      FROM services 
      WHERE shop_id = $1 
      ORDER BY display_order, name`,
      [decoded.shopId]
    )

    routeLogger.debug('Services fetched', { count: result.rows.length })
    return NextResponse.json({ success: true, services: result.rows })
  } catch (error) {
    routeLogger.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.services.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateServiceSchema, body, 'services.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { name, description, base_price, duration_minutes, category } = validation.data!
    routeLogger.debug('Creating service', { shopId: decoded.shopId, name })

    // Check if service already exists
    const existingService = await query(
      'SELECT id FROM services WHERE shop_id = $1 AND LOWER(name) = LOWER($2)',
      [decoded.shopId, name]
    )

    if (existingService.rows.length > 0) {
      routeLogger.warn('Service already exists', { name })
      return NextResponse.json({ error: 'Service already exists' }, { status: 409 })
    }

    // Insert new service
    const result = await query(
      `INSERT INTO services (
        shop_id, 
        name, 
        description, 
        base_price, 
        duration_minutes, 
        category,
        active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, name, base_price, duration_minutes, category, active, created_at`,
      [decoded.shopId, name, description, base_price, duration_minutes, category]
    )

    routeLogger.info('Service created successfully', { serviceId: result.rows[0].id, name })
    return NextResponse.json(
      { success: true, service: result.rows[0] },
      { status: 201 }
    )
  } catch (error) {
    routeLogger.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
