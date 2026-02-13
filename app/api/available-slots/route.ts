import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { validateInput, AvailableSlotsSchema, parseQueryParam } from '@/lib/validation'

const slotLogger = logger.createChild('AvailableSlots')

/**
 * GET - Calculate available time slots for a barber on a specific date
 * Query params: shopId, barberId, date (ISO 8601)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = parseQueryParam(searchParams.get('shopId'))
    const barberId = parseQueryParam(searchParams.get('barberId'))
    const dateStr = parseQueryParam(searchParams.get('date'))

    slotLogger.debug('Available slots request', {
      shopId,
      barberId,
      dateStr,
    })

    // Validate input
    const validation = validateInput(
      AvailableSlotsSchema,
      { shopId, barberId, date: dateStr },
      'available-slots'
    )

    if (!validation.success) {
      slotLogger.warn('Available slots validation failed', {
        errors: validation.errors,
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { date: validDate } = validation.data!
    const bookingDate = new Date(validDate)

    const dayOfWeek = bookingDate.getDay()

    // Get barber's schedule for this day
    try {
      const scheduleResult = await query(
        `SELECT is_working, start_time, end_time FROM barber_schedules
         WHERE barber_id = $1 AND day_of_week = $2`,
        [barberId, dayOfWeek]
      )

      if (scheduleResult.rowCount === 0) {
        slotLogger.info('No schedule found for barber on date', {
          barberId,
          dateStr,
        })
        return NextResponse.json({ success: true, availableSlots: [] })
      }

      const schedule = scheduleResult.rows[0]

      if (!schedule.is_working) {
        slotLogger.info('Barber not working on date', {
          barberId,
          dateStr,
        })
        return NextResponse.json({ success: true, availableSlots: [] })
      }

      const startTimeStr = schedule.start_time
      const endTimeStr = schedule.end_time

      const [startHour, startMin] = startTimeStr.split(':').map(Number)
      const [endHour, endMin] = endTimeStr.split(':').map(Number)

      const dayStart = new Date(bookingDate)
      dayStart.setHours(startHour, startMin, 0, 0)

      const dayEnd = new Date(bookingDate)
      dayEnd.setHours(endHour, endMin, 0, 0)

      // Get existing appointments for this barber on this day
      const appointmentsResult = await query(
        `SELECT start_time, end_time FROM appointments
         WHERE barber_id = $1
         AND DATE(start_time) = $2
         AND shop_id = $3`,
        [barberId, dateStr, shopId]
      )

      const existingAppointments = appointmentsResult.rows.map((apt) => ({
        start: new Date(apt.start_time),
        end: new Date(apt.end_time),
      }))

      // Generate 30-minute slots
      const slots: Array<{ startTime: string; endTime: string }> = []
      let current = new Date(dayStart)
      const appointmentDuration = 30 * 60 * 1000

      while (current.getTime() + appointmentDuration <= dayEnd.getTime()) {
        const slotStart = new Date(current)
        const slotEnd = new Date(current.getTime() + appointmentDuration)

        let isAvailable = true
        for (const apt of existingAppointments) {
          if (
            slotStart.getTime() < apt.end.getTime() &&
            slotEnd.getTime() > apt.start.getTime()
          ) {
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

        current = new Date(current.getTime() + appointmentDuration)
      }

      slotLogger.info('Available slots calculated', {
        barberId,
        dateStr,
        slotCount: slots.length,
      })

      return NextResponse.json({ success: true, availableSlots: slots })
    } catch (error) {
      slotLogger.error('Error calculating available slots', error)
      return NextResponse.json(
        { error: 'Failed to calculate available slots' },
        { status: 500 }
      )
    }
  } catch (error) {
    slotLogger.error('Unexpected error in GET handler', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
