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

/**
 * GET - Fetch time-off requests
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, denied
    const barberId = searchParams.get('barberId')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }

    let query = 'SELECT id, barber_id, start_date, end_date, reason, status, requested_at, approved_at FROM barber_time_off WHERE shop_id = $1'
    const params: any[] = [decoded.shopId]

    if (status) {
      query += ' AND status = $2'
      params.push(status)
    }

    if (barberId) {
      query += ` AND barber_id = $${params.length + 1}`
      params.push(parseInt(barberId))
    }

    query += ' ORDER BY requested_at DESC'

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      requests: result.rows.map((row: any) => ({
        id: row.id,
        barberId: row.barber_id,
        startDate: row.start_date,
        endDate: row.end_date,
        reason: row.reason,
        status: row.status,
        requestedAt: row.requested_at,
        approvedAt: row.approved_at,
      }))
    })
  } catch (error) {
    console.error('Error fetching time-off requests:', error)
    return NextResponse.json({ error: 'Failed to fetch time-off requests' }, { status: 500 })
  }
}

/**
 * POST - Request time off
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()
    const { barberId, startDate, endDate, reason } = body

    if (!barberId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    if (start < new Date()) {
      return NextResponse.json({ error: 'Cannot request time-off in the past' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO barber_time_off (shop_id, barber_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, barber_id, start_date, end_date, reason, status, requested_at`,
      [decoded.shopId, barberId, startDate, endDate, reason || null]
    )

    const request_data = result.rows[0]

    return NextResponse.json({
      success: true,
      request: {
        id: request_data.id,
        barberId: request_data.barber_id,
        startDate: request_data.start_date,
        endDate: request_data.end_date,
        reason: request_data.reason,
        status: request_data.status,
        requestedAt: request_data.requested_at,
      }
    })
  } catch (error) {
    console.error('Error requesting time-off:', error)
    return NextResponse.json({ error: 'Failed to request time-off' }, { status: 500 })
  }
}
