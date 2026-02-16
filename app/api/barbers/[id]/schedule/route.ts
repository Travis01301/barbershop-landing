import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Fetch barber's schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(id)

    // Verify barber belongs to shop
    const barberCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Fetch schedule
    const result = await query(
      `SELECT id, barber_id, day_of_week, is_working, start_time, end_time
       FROM barber_schedules
       WHERE barber_id = $1
       ORDER BY day_of_week`,
      [barberId]
    )

    // Format response
    const schedule = result.rows.map(row => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      isWorking: row.is_working,
      startTime: row.start_time,
      endTime: row.end_time,
    }))

    return NextResponse.json({ success: true, schedule })
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// PUT - Update barber's schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(id)
    const { schedule } = await request.json()

    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return NextResponse.json(
        { error: 'Schedule must have 7 days' },
        { status: 400 }
      )
    }

    // Verify barber belongs to shop
    const barberCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [barberId, decoded.shopId, 'barber']
    )

    if (barberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    // Update schedule for each day
    for (const day of schedule) {
      const { dayOfWeek, isWorking, startTime, endTime } = day

      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: 'Invalid day of week' },
          { status: 400 }
        )
      }

      if (isWorking && (!startTime || !endTime)) {
        return NextResponse.json(
          { error: 'Start and end times required when working' },
          { status: 400 }
        )
      }

      // Check if record exists
      const existing = await query(
        'SELECT id FROM barber_schedules WHERE barber_id = $1 AND day_of_week = $2',
        [barberId, dayOfWeek]
      )

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE barber_schedules
           SET is_working = $1, start_time = $2, end_time = $3, updated_at = NOW()
           WHERE barber_id = $4 AND day_of_week = $5`,
          [isWorking, isWorking ? startTime : null, isWorking ? endTime : null, barberId, dayOfWeek]
        )
      } else {
        // Insert new
        await query(
          `INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [barberId, dayOfWeek, isWorking, isWorking ? startTime : null, isWorking ? endTime : null]
        )
      }
    }

    // Fetch updated schedule
    const result = await query(
      `SELECT id, barber_id, day_of_week, is_working, start_time, end_time
       FROM barber_schedules
       WHERE barber_id = $1
       ORDER BY day_of_week`,
      [barberId]
    )

    const updatedSchedule = result.rows.map(row => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      isWorking: row.is_working,
      startTime: row.start_time,
      endTime: row.end_time,
    }))

    return NextResponse.json({ success: true, schedule: updatedSchedule })
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
