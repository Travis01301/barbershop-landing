import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

// GET - Calculate available time slots for a barber on a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const barberId = searchParams.get('barberId')
    const dateStr = searchParams.get('date') // Format: YYYY-MM-DD

    if (!shopId || !barberId || !dateStr) {
      return NextResponse.json(
        { error: 'shopId, barberId, and date are required' },
        { status: 400 }
      )
    }

    const bookingDate = new Date(dateStr)
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = bookingDate.getDay()

    // Get barber's schedule for this day
    const scheduleResult = await pool.query(
      `SELECT is_working, start_time, end_time FROM barber_schedules
       WHERE barber_id = $1 AND day_of_week = $2`,
      [barberId, dayOfWeek]
    )

    if (scheduleResult.rows.length === 0) {
      // No schedule entry for this day - return empty
      return NextResponse.json({ success: true, availableSlots: [] })
    }

    const schedule = scheduleResult.rows[0]

    // If barber not working this day, return empty
    if (!schedule.is_working) {
      return NextResponse.json({ success: true, availableSlots: [] })
    }

    const startTimeStr = schedule.start_time // e.g., "09:00"
    const endTimeStr = schedule.end_time     // e.g., "17:00"

    // Parse times
    const [startHour, startMin] = startTimeStr.split(':').map(Number)
    const [endHour, endMin] = endTimeStr.split(':').map(Number)

    const dayStart = new Date(bookingDate)
    dayStart.setHours(startHour, startMin, 0, 0)

    const dayEnd = new Date(bookingDate)
    dayEnd.setHours(endHour, endMin, 0, 0)

    // Get existing appointments for this barber on this day
    const appointmentsResult = await pool.query(
      `SELECT start_time, end_time FROM appointments
       WHERE barber_id = $1
       AND DATE(start_time) = $2
       AND shop_id = $3`,
      [barberId, dateStr, shopId]
    )

    const existingAppointments = appointmentsResult.rows.map(apt => ({
      start: new Date(apt.start_time),
      end: new Date(apt.end_time),
    }))

    // Generate 30-minute slots
    const slots: Array<{ startTime: string; endTime: string }> = []
    let current = new Date(dayStart)
    const appointmentDuration = 30 * 60 * 1000 // 30 minutes in milliseconds

    while (current.getTime() + appointmentDuration <= dayEnd.getTime()) {
      const slotStart = new Date(current)
      const slotEnd = new Date(current.getTime() + appointmentDuration)

      // Check if this slot conflicts with existing appointments
      let isAvailable = true
      for (const apt of existingAppointments) {
        // Check if slot overlaps with appointment
        if (slotStart.getTime() < apt.end.getTime() && slotEnd.getTime() > apt.start.getTime()) {
          isAvailable = false
          break
        }
      }

      if (isAvailable) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        })
      }

      // Move to next 30-minute increment
      current = new Date(current.getTime() + appointmentDuration)
    }

    return NextResponse.json({ success: true, availableSlots: slots })
  } catch (error) {
    console.error('Error calculating available slots:', error)
    return NextResponse.json(
      { error: 'Failed to calculate available slots' },
      { status: 500 }
    )
  }
}
