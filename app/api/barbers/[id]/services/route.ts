import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Get services for a specific barber
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)

    // Verify barber belongs to shop
    const barber = await query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barber.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Get barber's services
    const result = await query(
      `SELECT 
        bs.id,
        bs.barber_id,
        bs.service_id,
        s.name,
        s.description,
        s.base_price,
        s.duration_minutes as base_duration,
        bs.price,
        bs.duration_minutes,
        bs.available,
        bs.created_at
      FROM barber_services bs
      JOIN services s ON s.id = bs.service_id
      WHERE bs.barber_id = $1
      ORDER BY s.name`,
      [barberId]
    )

    return NextResponse.json({ success: true, services: result.rows })
  } catch (error) {
    console.error('Error fetching barber services:', error)
    return NextResponse.json({ error: 'Failed to fetch barber services' }, { status: 500 })
  }
}

// POST - Assign service to barber
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const { service_id, price, duration_minutes } = await request.json()

    // Verify barber belongs to shop
    const barber = await query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barber.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Verify service belongs to shop
    const service = await query(
      'SELECT id, base_price, duration_minutes FROM services WHERE id = $1 AND shop_id = $2',
      [service_id, decoded.shopId]
    )

    if (service.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Check if already assigned
    const existing = await query(
      'SELECT id FROM barber_services WHERE barber_id = $1 AND service_id = $2',
      [barberId, service_id]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Service already assigned to barber' }, { status: 409 })
    }

    // Use service defaults if not provided
    const finalPrice = price || service.rows[0].base_price
    const finalDuration = duration_minutes || service.rows[0].duration_minutes

    // Insert barber-service assignment
    const result = await query(
      `INSERT INTO barber_services (barber_id, service_id, price, duration_minutes, available)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, barber_id, service_id, price, duration_minutes, available, created_at`,
      [barberId, service_id, finalPrice, finalDuration]
    )

    return NextResponse.json(
      { success: true, service: result.rows[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error assigning service to barber:', error)
    return NextResponse.json(
      { error: 'Failed to assign service to barber' },
      { status: 500 }
    )
  }
}
