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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { is_active } = await request.json()

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 AND shop_id = $3 RETURNING *',
      [is_active, id, decoded.shopId]
    )

    return NextResponse.json({ success: true, barber: result.rows[0] })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to update barber' }, { status: 500 })
  }
}
