import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

// GET - Check if customer exists by email (public endpoint for booking form)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const email = searchParams.get('email')

    if (!shopId || !email) {
      return NextResponse.json(
        { error: 'shopId and email are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `SELECT id, name, phone, styling_notes, allergies, preferred_barber_id
       FROM customer_profiles
       WHERE shop_id = $1 AND email = $2`,
      [parseInt(shopId), email]
    )

    if (result.rows.length > 0) {
      return NextResponse.json({
        success: true,
        customer: result.rows[0],
      })
    } else {
      return NextResponse.json({
        success: true,
        customer: null,
      })
    }
  } catch (error) {
    console.error('Error checking customer:', error)
    return NextResponse.json({ success: false, error: 'Failed to check customer' }, { status: 500 })
  }
}
