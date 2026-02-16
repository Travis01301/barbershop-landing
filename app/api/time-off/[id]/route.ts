import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

/**
 * PUT/PATCH - Approve or deny time-off request (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { id } = await params
    const body = await request.json()
    const { status, denialReason } = body // status: 'approved' or 'denied'

    if (!status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const statusValue = status === 'approved' ? 'approved' : 'denied'

    // Update the time-off request
    const result = await query(
      `UPDATE barber_time_off
       SET status = $1, approved_by = (SELECT id FROM customer_profiles WHERE email = $2 LIMIT 1),
           approved_at = NOW(), denial_reason = $3
       WHERE id = $4 AND shop_id = $5
       RETURNING id, barber_id, start_date, end_date, reason, status, approved_at`,
      [statusValue, 'admin@example.com', denialReason || null, parseInt(id), decoded.shopId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

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
        approvedAt: request_data.approved_at,
      }
    })
  } catch (error) {
    console.error('Error updating time-off request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
