import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { CreateScheduleSchema, validateInput, parseQueryParam } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * GET - Fetch barber schedules for a shop
 */
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.schedules.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const barberId = parseQueryParam(searchParams.get('barberId'))
    const shopId = parseQueryParam(searchParams.get('shopId'))

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const sid = parseInt(shopId || decoded.shopId.toString())

    routeLogger.debug('Token verified', { shopId: sid })

    let queryStr = 'SELECT id, barber_id, day_of_week, start_time, end_time, is_active FROM barber_schedules WHERE shop_id = $1'
    const params = [sid]

    if (barberId) {
      queryStr += ' AND barber_id = $2'
      params.push(parseInt(barberId))
    }

    queryStr += ' ORDER BY barber_id, day_of_week'

    const result = await query(queryStr, params)

    // Format response with day names
    const formatted = result.rows.map((row: any) => ({
      id: row.id,
      barberId: row.barber_id,
      day: DAYS[row.day_of_week],
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
    }))

    routeLogger.debug('Schedules fetched', { count: formatted.length })
    return NextResponse.json({ successful: true, schedules: formatted })
  } catch (error) {
    routeLogger.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

/**
 * POST - Create or update barber schedule
 */
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.schedules.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateScheduleSchema, body, 'schedules.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { barberId, dayOfWeek, startTime, endTime, isActive = true } = validation.data!
    routeLogger.debug('Creating schedule', { shopId: decoded.shopId, barberId, dayOfWeek })

    // Upsert schedule (insert or update)
    const result = await query(
      `INSERT INTO barber_schedules (shop_id, barber_id, day_of_week, start_time, end_time, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (barber_id, day_of_week) 
       DO UPDATE SET start_time = $4, end_time = $5, is_active = $6, updated_at = NOW()
       RETURNING id, barber_id, day_of_week, start_time, end_time, is_active`,
      [decoded.shopId, barberId, dayOfWeek, startTime, endTime, isActive]
    )

    const schedule = result.rows[0]

    routeLogger.info('Schedule created/updated', { scheduleId: schedule.id, barberId, dayOfWeek })
    return NextResponse.json({
      success: true,
      schedule: {
        id: schedule.id,
        barberId: schedule.barber_id,
        day: DAYS[schedule.day_of_week],
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        isActive: schedule.is_active,
      }
    })
  } catch (error) {
    routeLogger.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
