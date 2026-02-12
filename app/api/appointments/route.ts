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

export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }

    // Get appointments for this shop
    const result = await pool.query(
      `SELECT 
        a.id, 
        a.customer_name, 
        a.customer_phone, 
        a.customer_email,
        a.start_time, 
        a.status, 
        a.notes,
        u.name as barber_name
      FROM appointments a
      LEFT JOIN users u ON a.barber_id = u.id
      WHERE a.shop_id = $1
      ORDER BY a.start_time DESC
      LIMIT 50`,
      [decoded.shopId]
    )

    return NextResponse.json({ success: true, appointments: result.rows })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
