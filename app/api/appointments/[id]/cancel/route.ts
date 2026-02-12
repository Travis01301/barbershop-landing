import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import crypto from 'crypto'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

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
    const { token, reason } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 })
    }

    // Get appointment first
    const appointmentResult = await pool.query(
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

    // Check if appointment is already cancelled or past
    if (apt.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment already cancelled' },
        { status: 400 }
      )
    }

    // Check if appointment is in the future (can't cancel past appointments)
    const appointmentTime = new Date(apt.start_time)
    if (appointmentTime < new Date()) {
      return NextResponse.json(
        {
          error: 'Cannot cancel past appointments',
          appointment_date: appointmentTime,
        },
        { status: 400 }
      )
    }

    // Update appointment status to cancelled
    const updateResult = await pool.query(
      `UPDATE appointments 
       SET status = 'cancelled', updated_at = NOW(), notes = $1
       WHERE id = $2
       RETURNING *`,
      [
        reason
          ? `CANCELLED: ${reason}`
          : 'CANCELLED by customer',
        id,
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updateResult.rows[0],
    })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    )
  }
}
