import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - List barbers
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }

    const result = await query(
      'SELECT id, name, email, is_active FROM users WHERE shop_id = $1 AND role = $2 ORDER BY name',
      [decoded.shopId, 'barber']
    )

    return NextResponse.json({ success: true, barbers: result.rows })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch barbers' }, { status: 500 })
  }
}

// POST - Add barber with default schedule
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { name, email, password } = await request.json()

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert barber
    const result = await query(
      'INSERT INTO users (shop_id, name, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email',
      [decoded.shopId, name, email, passwordHash, 'barber', true]
    )

    const barberId = result.rows[0].id

    // Insert default schedule (Mon-Fri 9AM-5PM, closed weekends)
    const defaultSchedule = [
      { dayOfWeek: 0, isWorking: false }, // Sunday
      { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00' }, // Monday
      { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00' }, // Tuesday
      { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00' }, // Wednesday
      { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00' }, // Thursday
      { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00' }, // Friday
      { dayOfWeek: 6, isWorking: false }, // Saturday
    ]

    for (const schedule of defaultSchedule) {
      await query(
        `INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)`,
        [barberId, schedule.dayOfWeek, schedule.isWorking, schedule.startTime || null, schedule.endTime || null]
      )
    }

    return NextResponse.json({ success: true, barber: result.rows[0] })
  } catch (error: any) {
    console.error('Error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add barber' }, { status: 500 })
  }
}
