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

// GET - List all services for the shop
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }

    const result = await pool.query(
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

    return NextResponse.json({ success: true, services: result.rows })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { name, description, base_price, duration_minutes, category } = await request.json()

    // Validate inputs
    if (!name || !base_price || !duration_minutes) {
      return NextResponse.json(
        { error: 'Missing required fields: name, base_price, duration_minutes' },
        { status: 400 }
      )
    }

    // Check if service already exists
    const existingService = await pool.query(
      'SELECT id FROM services WHERE shop_id = $1 AND LOWER(name) = LOWER($2)',
      [decoded.shopId, name]
    )

    if (existingService.rows.length > 0) {
      return NextResponse.json({ error: 'Service already exists' }, { status: 409 })
    }

    // Insert new service
    const result = await pool.query(
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

    return NextResponse.json(
      { success: true, service: result.rows[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
