import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * GET - Fetch barber schedules for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    const shopId = searchParams.get('shopId')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const sid = parseInt(shopId || decoded.shopId.toString())

    let query = 'SELECT id, barber_id, day_of_week, start_time, end_time, is_active FROM barber_schedules WHERE shop_id = $1'
    const params = [sid]

    if (barberId) {
      query += ' AND barber_id = $2'
      params.push(parseInt(barberId))
    }

    query += ' ORDER BY barber_id, day_of_week'

    const result = await query(query, params)

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

    return NextResponse.json({ successful: true, schedules: formatted })
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

/**
 * POST - Create or update barber schedule
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()
    const { barberId, dayOfWeek, startTime, endTime, isActive = true } = body

    if (!barberId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
    console.error('Error creating schedule:', error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
