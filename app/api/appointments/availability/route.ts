import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const availabilityLogger = logger.createChild('api.appointments.availability')

// Validation schema for availability queries
const AvailabilityQuerySchema = z.object({
  barberId: z.string().min(1, 'Barber ID is required'),
  shopId: z.string().min(1, 'Shop ID is required'),
  startDate: z.string().refine(
    date => !isNaN(new Date(date).getTime()),
    'Invalid start date'
  ),
  endDate: z.string().refine(
    date => !isNaN(new Date(date).getTime()),
    'Invalid end date'
  ),
  slotDurationMinutes: z.string().transform(v => parseInt(v)).default('30'),
})

interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  appointmentId?: string
}

interface AvailabilityDay {
  date: string
  dayOfWeek: number
  slots: TimeSlot[]
  isWorkingDay: boolean
}

/**
 * Get available time slots for a barber within a date range
 * GET /api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-21&slotDurationMinutes=30
 */
export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams)

    // Validate query parameters
    const validation = AvailabilityQuerySchema.safeParse(params)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { barberId, shopId, startDate, endDate, slotDurationMinutes } = validation.data
    const barberIdNum = parseInt(barberId)
    const shopIdNum = parseInt(shopId)
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)

    // Validate date range
    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Limit query to 90 days to prevent performance issues
    const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 90) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      )
    }

    // Get barber schedule for the date range
    const barberResult = await query(
      `SELECT id, shop_id FROM users WHERE id = $1 AND shop_id = $2 AND role = 'barber'`,
      [barberIdNum, shopIdNum]
    )

    if (barberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Barber not found' },
        { status: 404 }
      )
    }

    // Get barber schedule
    const scheduleResult = await query(
      `SELECT day_of_week, start_time, end_time, is_working 
       FROM barber_schedules 
       WHERE barber_id = $1`,
      [barberIdNum]
    )

    const schedule: Record<number, any> = {}
    scheduleResult.rows.forEach(row => {
      schedule[row.day_of_week] = row
    })

    // Get existing appointments in the date range
    const appointmentsResult = await query(
      `SELECT id, start_time, end_time 
       FROM appointments 
       WHERE barber_id = $1 AND shop_id = $2
         AND start_time >= $3 AND end_time <= $4
         AND status = 'confirmed'`,
      [barberIdNum, shopIdNum, startDateObj.toISOString(), endDateObj.toISOString()]
    )

    const bookedSlots = appointmentsResult.rows.map(apt => ({
      id: apt.id,
      startTime: new Date(apt.start_time),
      endTime: new Date(apt.end_time),
    }))

    // Generate availability calendar
    const availability: AvailabilityDay[] = []
    const currentDate = new Date(startDateObj)
    currentDate.setHours(0, 0, 0, 0)

    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay()
      const daySchedule = schedule[dayOfWeek]
      const isWorkingDay = daySchedule && daySchedule.is_working === true

      const dayAvailability: AvailabilityDay = {
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek,
        isWorkingDay,
        slots: [],
      }

      if (isWorkingDay && daySchedule.start_time && daySchedule.end_time) {
        // Parse working hours
        const [startHour, startMin] = daySchedule.start_time.split(':').map(Number)
        const [endHour, endMin] = daySchedule.end_time.split(':').map(Number)

        const dayStart = new Date(currentDate)
        dayStart.setHours(startHour, startMin, 0, 0)

        const dayEnd = new Date(currentDate)
        dayEnd.setHours(endHour, endMin, 0, 0)

        // Generate time slots
        let slotStart = new Date(dayStart)
        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000)

          // Don't create slots that go past closing time
          if (slotEnd > dayEnd) break

          // Check if this slot is already booked
          const isBooked = bookedSlots.some(
            apt =>
              (slotStart >= apt.startTime && slotStart < apt.endTime) ||
              (slotEnd > apt.startTime && slotEnd <= apt.endTime) ||
              (slotStart <= apt.startTime && slotEnd >= apt.endTime)
          )

          dayAvailability.slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            isAvailable: !isBooked,
            appointmentId: isBooked
              ? bookedSlots.find(apt => slotStart >= apt.startTime && slotStart < apt.endTime)?.id
              : undefined,
          })

          slotStart = new Date(slotEnd)
        }
      }

      availability.push(dayAvailability)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    availabilityLogger.info('Availability retrieved', {
      barberId: barberIdNum,
      shopId: shopIdNum,
      days: availability.length,
      totalSlots: availability.reduce((sum, day) => sum + day.slots.length, 0),
    })

    return NextResponse.json({
      success: true,
      data: availability,
      meta: {
        barberId: barberIdNum,
        shopId: shopIdNum,
        startDate: startDate,
        endDate: endDate,
        slotDurationMinutes,
        totalDays: availability.length,
        availableSlotsCount: availability.reduce(
          (sum, day) => sum + day.slots.filter(s => s.isAvailable).length,
          0
        ),
      },
    })
  } catch (error) {
    availabilityLogger.error('Error fetching availability', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
