import { query } from './db'
import { logger } from './logger'

const availabilityLogger = logger.createChild('availability-service')

export interface ConflictCheckResult {
  hasConflict: boolean
  conflictingAppointmentId?: string
  conflictingAppointmentTime?: { start: Date; end: Date }
}

export interface BarberAvailability {
  barberId: number
  startTime: Date
  endTime: Date
  isAvailable: boolean
  workingHours?: { start: string; end: string }
}

/**
 * Availability Service
 * Handles slot checking, conflict detection, and availability management
 */
class AvailabilityService {
  /**
   * Check if a specific time slot is available for a barber
   */
  async checkSlotAvailability(
    barberId: number,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<ConflictCheckResult> {
    try {
      // Validate inputs
      if (startTime >= endTime) {
        return {
          hasConflict: true,
          conflictingAppointmentId: 'INVALID_TIME_RANGE',
        }
      }

      // Check for overlapping confirmed appointments
      let query_text = `
        SELECT id, start_time, end_time 
        FROM appointments 
        WHERE barber_id = $1 
          AND status = 'confirmed'
          AND (
            (start_time < $3 AND end_time > $2) OR
            (start_time >= $2 AND start_time < $3) OR
            (end_time > $2 AND end_time <= $3)
          )
      `
      const params: any[] = [barberId, startTime.toISOString(), endTime.toISOString()]

      // Exclude specific appointment if provided (for rescheduling)
      if (excludeAppointmentId) {
        query_text += ` AND id != $4`
        params.push(excludeAppointmentId)
      }

      const result = await query(query_text, params)

      if (result.rows.length > 0) {
        const conflict = result.rows[0]
        availabilityLogger.info('Conflict found', {
          barberId,
          requestedStart: startTime,
          requestedEnd: endTime,
          conflictingId: conflict.id,
        })

        return {
          hasConflict: true,
          conflictingAppointmentId: conflict.id,
          conflictingAppointmentTime: {
            start: new Date(conflict.start_time),
            end: new Date(conflict.end_time),
          },
        }
      }

      return {
        hasConflict: false,
      }
    } catch (error) {
      availabilityLogger.error('Error checking slot availability', error)
      return {
        hasConflict: true, // Fail safe: return conflict if error
        conflictingAppointmentId: 'ERROR_CHECKING_AVAILABILITY',
      }
    }
  }

  /**
   * Check if barber is working on a given date
   */
  async isBarberWorking(barberId: number, date: Date): Promise<boolean> {
    try {
      const dayOfWeek = date.getDay()

      const result = await query(
        `SELECT is_working FROM barber_schedules 
         WHERE barber_id = $1 AND day_of_week = $2`,
        [barberId, dayOfWeek]
      )

      if (result.rows.length === 0) {
        return false // No schedule found, assume not working
      }

      return result.rows[0].is_working === true
    } catch (error) {
      availabilityLogger.error('Error checking barber working status', error)
      return false
    }
  }

  /**
   * Get barber working hours for a specific date
   */
  async getBarberWorkingHours(
    barberId: number,
    date: Date
  ): Promise<{ start: string; end: string } | null> {
    try {
      const dayOfWeek = date.getDay()

      const result = await query(
        `SELECT start_time, end_time FROM barber_schedules 
         WHERE barber_id = $1 AND day_of_week = $2 AND is_working = true`,
        [barberId, dayOfWeek]
      )

      if (result.rows.length === 0) {
        return null
      }

      return {
        start: result.rows[0].start_time,
        end: result.rows[0].end_time,
      }
    } catch (error) {
      availabilityLogger.error('Error getting barber working hours', error)
      return null
    }
  }

  /**
   * Validate appointment time is within working hours
   */
  async validateAppointmentTime(
    barberId: number,
    startTime: Date,
    endTime: Date
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check if barber is working that day
      const isWorking = await this.isBarberWorking(barberId, startTime)
      if (!isWorking) {
        return {
          valid: false,
          reason: 'Barber is not working on this date',
        }
      }

      // Get working hours
      const hours = await this.getBarberWorkingHours(barberId, startTime)
      if (!hours) {
        return {
          valid: false,
          reason: 'Cannot determine working hours',
        }
      }

      // Parse working hours
      const [startHour, startMin] = hours.start.split(':').map(Number)
      const [endHour, endMin] = hours.end.split(':').map(Number)

      const dayStart = new Date(startTime)
      dayStart.setHours(startHour, startMin, 0, 0)

      const dayEnd = new Date(startTime)
      dayEnd.setHours(endHour, endMin, 0, 0)

      // Check if appointment is within working hours
      if (startTime < dayStart || endTime > dayEnd) {
        return {
          valid: false,
          reason: `Appointment must be between ${hours.start} and ${hours.end}`,
        }
      }

      return { valid: true }
    } catch (error) {
      availabilityLogger.error('Error validating appointment time', error)
      return {
        valid: false,
        reason: 'Error validating appointment time',
      }
    }
  }

  /**
   * Get next available slot for a barber
   */
  async getNextAvailableSlot(
    barberId: number,
    slotDurationMinutes: number = 30,
    startingFrom: Date = new Date()
  ): Promise<{ start: Date; end: Date } | null> {
    try {
      let checkDate = new Date(startingFrom)
      checkDate.setHours(0, 0, 0, 0)

      // Search for up to 30 days
      for (let i = 0; i < 30; i++) {
        const isWorking = await this.isBarberWorking(barberId, checkDate)
        if (!isWorking) {
          checkDate.setDate(checkDate.getDate() + 1)
          continue
        }

        const hours = await this.getBarberWorkingHours(barberId, checkDate)
        if (!hours) {
          checkDate.setDate(checkDate.getDate() + 1)
          continue
        }

        // Parse working hours
        const [startHour, startMin] = hours.start.split(':').map(Number)
        const [endHour, endMin] = hours.end.split(':').map(Number)

        let slotStart = new Date(checkDate)
        slotStart.setHours(startHour, startMin, 0, 0)

        // For today, start from now or opening time, whichever is later
        if (checkDate.toDateString() === new Date().toDateString()) {
          slotStart = new Date(Math.max(slotStart.getTime(), new Date().getTime()))
        }

        const dayEnd = new Date(checkDate)
        dayEnd.setHours(endHour, endMin, 0, 0)

        // Try to find an available slot during the day
        while (slotStart.getTime() + slotDurationMinutes * 60 * 1000 <= dayEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000)

          const conflict = await this.checkSlotAvailability(barberId, slotStart, slotEnd)
          if (!conflict.hasConflict) {
            return { start: slotStart, end: slotEnd }
          }

          slotStart = new Date(slotEnd)
        }

        checkDate.setDate(checkDate.getDate() + 1)
      }

      return null
    } catch (error) {
      availabilityLogger.error('Error finding next available slot', error)
      return null
    }
  }

  /**
   * Log availability check for audit trail
   */
  async logAvailabilityCheck(
    barberId: number,
    shopId: number,
    startTime: Date,
    endTime: Date,
    action: 'checked' | 'booked' | 'cancelled',
    appointmentId?: string,
    hadConflicts: boolean = false
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO availability_audit 
         (barber_id, shop_id, action, appointment_id, start_time, end_time, had_conflicts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [barberId, shopId, action, appointmentId || null, startTime.toISOString(), endTime.toISOString(), hadConflicts]
      )
    } catch (error) {
      availabilityLogger.error('Error logging availability check', error)
    }
  }

  /**
   * Get availability statistics for a barber
   */
  async getAvailabilityStats(
    barberId: number,
    shopId: number,
    days: number = 30
  ): Promise<{
    bookingRate: number
    averageDailyBookings: number
    peakTimes: Array<{ hour: number; count: number }>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get booking count by hour
      const result = await query(
        `SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          COUNT(*) as count
         FROM appointments
         WHERE barber_id = $1 AND shop_id = $2 AND status = 'confirmed'
           AND start_time >= $3
         GROUP BY EXTRACT(HOUR FROM start_time)
         ORDER BY count DESC
         LIMIT 10`,
        [barberId, shopId, startDate.toISOString()]
      )

      const peakTimes = result.rows.map(row => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count),
      }))

      // Get overall stats
      const statsResult = await query(
        `SELECT 
          COUNT(*) as total_appointments,
          EXTRACT(DAY FROM (NOW() - $3::timestamp)) as days_counted
         FROM appointments
         WHERE barber_id = $1 AND shop_id = $2 AND status = 'confirmed'
           AND start_time >= $3`,
        [barberId, shopId, startDate.toISOString()]
      )

      const stats = statsResult.rows[0]
      const daysCounted = Math.max(parseInt(stats.days_counted) || days, 1)
      const totalAppointments = parseInt(stats.total_appointments) || 0

      return {
        bookingRate: (totalAppointments / daysCounted / 8) * 100, // Assume 8-hour days
        averageDailyBookings: totalAppointments / daysCounted,
        peakTimes,
      }
    } catch (error) {
      availabilityLogger.error('Error getting availability stats', error)
      return {
        bookingRate: 0,
        averageDailyBookings: 0,
        peakTimes: [],
      }
    }
  }
}

// Export singleton
export const availabilityService = new AvailabilityService()

export default AvailabilityService
