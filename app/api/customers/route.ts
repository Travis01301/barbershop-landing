import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - List all customers for a shop
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }

    const result = await pool.query(
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

    return NextResponse.json({ success: true, customers: result.rows })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// POST - Create new customer profile
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { email, name, phone, address } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO customer_profiles (shop_id, email, name, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [decoded.shopId, email, name, phone || null, address || null]
    )

    return NextResponse.json({ success: true, customer: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
