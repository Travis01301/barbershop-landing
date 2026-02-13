import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { TimeOffSchema, validateInput, parseQueryParam } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

/**
 * GET - Fetch time-off requests
 */
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.time-off.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const status = parseQueryParam(searchParams.get('status')) // pending, approved, denied
    const barberId = parseQueryParam(searchParams.get('barberId'))

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    routeLogger.debug('Token verified', { shopId: decoded.shopId })

    let queryStr = 'SELECT id, barber_id, start_date, end_date, reason, status, requested_at, approved_at FROM barber_time_off WHERE shop_id = $1'
    const params: any[] = [decoded.shopId]

    if (status) {
      queryStr += ' AND status = $2'
      params.push(status)
    }

    if (barberId) {
      queryStr += ` AND barber_id = $${params.length + 1}`
      params.push(parseInt(barberId))
    }

    queryStr += ' ORDER BY requested_at DESC'

    const result = await query(queryStr, params)

    routeLogger.debug('Time-off requests fetched', { count: result.rows.length })
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
    routeLogger.error('Error fetching time-off requests:', error)
    return NextResponse.json({ error: 'Failed to fetch time-off requests' }, { status: 500 })
  }
}

/**
 * POST - Request time off
 */
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.time-off.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(TimeOffSchema, body, 'time-off.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { barberId, startDate, endDate, reason } = validation.data!
    routeLogger.debug('Processing time-off request', { shopId: decoded.shopId, barberId, startDate, endDate })

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      routeLogger.warn('Invalid date range', { startDate, endDate })
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    if (start < new Date()) {
      routeLogger.warn('Attempt to request time-off in the past', { startDate })
      return NextResponse.json({ error: 'Cannot request time-off in the past' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO barber_time_off (shop_id, barber_id, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, barber_id, start_date, end_date, reason, status, requested_at`,
      [decoded.shopId, barberId, startDate, endDate, reason || null]
    )

    const requestData = result.rows[0]

    routeLogger.info('Time-off request created', { requestId: requestData.id, barberId })
    return NextResponse.json({
      success: true,
      request: {
        id: requestData.id,
        barberId: requestData.barber_id,
        startDate: requestData.start_date,
        endDate: requestData.end_date,
        reason: requestData.reason,
        status: requestData.status,
        requestedAt: requestData.requested_at,
      }
    })
  } catch (error) {
    routeLogger.error('Error requesting time-off:', error)
    return NextResponse.json({ error: 'Failed to request time-off' }, { status: 500 })
  }
}
