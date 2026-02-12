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

// PUT - Update barber's service pricing/duration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const serviceId = parseInt(params.serviceId)
    const { price, duration_minutes, available } = await request.json()

    // Verify barber belongs to shop
    const barber = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barber.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Verify assignment exists
    const assignment = await pool.query(
      `SELECT bs.id FROM barber_services bs
       JOIN services s ON s.id = bs.service_id
       WHERE bs.barber_id = $1 AND bs.service_id = $2 AND s.shop_id = $3`,
      [barberId, serviceId, decoded.shopId]
    )

    if (assignment.rows.length === 0) {
      return NextResponse.json({ error: 'Service assignment not found' }, { status: 404 })
    }

    // Update assignment
    const result = await pool.query(
      `UPDATE barber_services 
       SET price = COALESCE($1, price),
           duration_minutes = COALESCE($2, duration_minutes),
           available = COALESCE($3, available)
       WHERE barber_id = $4 AND service_id = $5
       RETURNING id, barber_id, service_id, price, duration_minutes, available, updated_at`,
      [price, duration_minutes, available, barberId, serviceId]
    )

    return NextResponse.json({ success: true, service: result.rows[0] })
  } catch (error) {
    console.error('Error updating barber service:', error)
    return NextResponse.json({ error: 'Failed to update barber service' }, { status: 500 })
  }
}

// DELETE - Remove service from barber
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const serviceId = parseInt(params.serviceId)

    // Verify barber belongs to shop
    const barber = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barber.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Verify assignment exists
    const assignment = await pool.query(
      `SELECT bs.id FROM barber_services bs
       JOIN services s ON s.id = bs.service_id
       WHERE bs.barber_id = $1 AND bs.service_id = $2 AND s.shop_id = $3`,
      [barberId, serviceId, decoded.shopId]
    )

    if (assignment.rows.length === 0) {
      return NextResponse.json({ error: 'Service assignment not found' }, { status: 404 })
    }

    // Delete assignment
    await pool.query(
      'DELETE FROM barber_services WHERE barber_id = $1 AND service_id = $2',
      [barberId, serviceId]
    )

    return NextResponse.json({ success: true, message: 'Service removed from barber' })
  } catch (error) {
    console.error('Error removing barber service:', error)
    return NextResponse.json({ error: 'Failed to remove service from barber' }, { status: 500 })
  }
}
