import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import crypto from 'crypto'


function generateToken(appointmentId: number, email: string): string {
  const data = `${appointmentId}:${email}:${process.env.TOKEN_SECRET || 'secret'}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { token, newDate, newTime } = body

    if (!token || !newDate || !newTime) {
      return NextResponse.json(
        { error: 'token, newDate, and newTime are required' },
        { status: 400 }
      )
    }

    // Get current appointment
    const appointmentResult = await query(
      `SELECT * FROM appointments WHERE id = $1`,
      [id]
    )

    if (appointmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const apt = appointmentResult.rows[0]

    // Validate token
    const expectedToken = generateToken(apt.id, apt.customer_email)
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if appointment can be rescheduled
    if (apt.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot reschedule cancelled appointment' },
        { status: 400 }
      )
    }

    const appointmentTime = new Date(apt.start_time)
    const now = new Date()

    // Can't reschedule past appointments
    if (appointmentTime < now) {
      return NextResponse.json(
        { error: 'Cannot reschedule past appointments' },
        { status: 400 }
      )
    }

    // Must reschedule with at least 24 hours notice
    const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntil < 24) {
      return NextResponse.json(
        {
          error: 'Cannot reschedule within 24 hours of appointment',
          hoursUntil: Math.floor(hoursUntil),
        },
        { status: 400 }
      )
    }

    // Parse new date and time
    const newStartTime = new Date(`${newDate} ${newTime}`)
    const newEndTime = new Date(newStartTime.getTime() + 30 * 60000) // 30 min appointment

    if (newStartTime < now) {
      return NextResponse.json(
        { error: 'Cannot schedule in the past' },
        { status: 400 }
      )
    }

    // Check if new time slot is available (excluding current appointment)
    const conflictResult = await query(
      `SELECT COUNT(*) as conflict_count FROM appointments
       WHERE barber_id = $1
       AND shop_id = $2
       AND id != $3
       AND status != 'cancelled'
       AND start_time < $5
       AND end_time > $4`,
      [apt.barber_id, apt.shop_id, apt.id, newStartTime, newEndTime]
    )

    if (parseInt(conflictResult.rows[0].conflict_count) > 0) {
      return NextResponse.json(
        { error: 'Time slot is already booked. Please choose another time.' },
        { status: 400 }
      )
    }

    // Update appointment
    const updateResult = await query(
      `UPDATE appointments 
       SET start_time = $1, end_time = $2, status = 'confirmed', updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStartTime, newEndTime, id]
    )

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updateResult.rows[0],
    })
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule appointment' },
      { status: 500 }
    )
  }
}
