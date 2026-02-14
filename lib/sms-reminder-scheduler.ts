import { query } from './db'
import { smsService } from './sms-service'
import { logger } from './logger'

const schedulerLogger = logger.createChild('sms-reminder-scheduler')

/**
 * Schedule SMS reminders for an appointment
 * Creates reminder records in the database for the cron job to process
 */
export async function scheduleRemindersSMS(
  appointmentId: string,
  customerPhone: string,
  appointmentTime: Date
): Promise<{ success: boolean; reminders: number }> {
  try {
    const now = new Date()
    const scheduledReminders: { type: string; time: Date }[] = []

    // 24-hour reminder (if appointment is more than 24 hours away)
    const timeUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (timeUntilAppointment > 24) {
      const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000)
      scheduledReminders.push({ type: '24h', time: reminder24h })
    }

    // Day-of reminder (if appointment is more than 1 hour away)
    if (timeUntilAppointment > 1) {
      const reminderDayOf = new Date(appointmentTime)
      reminderDayOf.setHours(reminderDayOf.getHours())
      scheduledReminders.push({ type: 'day_of', time: reminderDayOf })
    }

    // Insert reminder records
    let insertedCount = 0
    for (const reminder of scheduledReminders) {
      try {
        await query(
          `INSERT INTO sms_reminders 
           (appointment_id, customer_phone, reminder_type, scheduled_for, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [appointmentId, customerPhone, reminder.type, reminder.time.toISOString()]
        )
        insertedCount++
      } catch (error) {
        schedulerLogger.error('Error inserting reminder record', error, {
          appointmentId,
          reminderType: reminder.type,
        })
      }
    }

    schedulerLogger.info('SMS reminders scheduled', {
      appointmentId,
      count: insertedCount,
    })

    return {
      success: insertedCount > 0,
      reminders: insertedCount,
    }
  } catch (error) {
    schedulerLogger.error('Error scheduling SMS reminders', error, { appointmentId })
    return {
      success: false,
      reminders: 0,
    }
  }
}

/**
 * Send booking confirmation SMS immediately
 */
export async function sendBookingConfirmationSMS(
  appointmentId: string,
  shopId: number,
  customerName: string,
  customerPhone: string,
  barberName: string | null,
  appointmentTime: Date,
  serviceName?: string,
  shopName?: string
): Promise<boolean> {
  try {
    // Get shop name if not provided
    let finalShopName = shopName
    if (!finalShopName) {
      const shopResult = await query(
        `SELECT name FROM shops WHERE id = $1`,
        [shopId]
      )
      finalShopName = shopResult.rows[0]?.name || 'Barbershop'
    }

    const appointmentDate = appointmentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const appointmentTimeStr = appointmentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const success = await smsService.sendBookingConfirmation({
      customerName,
      customerPhone,
      barberName: barberName || 'Your barber',
      appointmentDate,
      appointmentTime: appointmentTimeStr,
      serviceName,
      shopName: finalShopName,
    })

    // Log SMS
    await smsService.logSMSSent(appointmentId, customerPhone, 'booking', success)

    return success
  } catch (error) {
    schedulerLogger.error('Error sending booking SMS', error, { appointmentId })
    return false
  }
}

/**
 * Send cancellation SMS immediately
 */
export async function sendCancellationSMS(
  appointmentId: string,
  customerName: string,
  customerPhone: string,
  barberName: string | null,
  appointmentTime: Date,
  cancellationFee?: number,
  shopName?: string
): Promise<boolean> {
  try {
    let finalShopName = shopName
    if (!finalShopName) {
      const shopResult = await query(
        `SELECT s.name FROM appointments a
         JOIN shops s ON a.shop_id = s.id
         WHERE a.id = $1`,
        [appointmentId]
      )
      finalShopName = shopResult.rows[0]?.name || 'Barbershop'
    }

    const appointmentTimeStr = appointmentTime.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const success = await smsService.sendCancellationNotice({
      customerName,
      customerPhone,
      barberName: barberName || 'Your barber',
      appointmentTime: appointmentTimeStr,
      cancellationFee,
      shopName: finalShopName,
    })

    // Log SMS
    await smsService.logSMSSent(appointmentId, customerPhone, 'cancellation', success)

    return success
  } catch (error) {
    schedulerLogger.error('Error sending cancellation SMS', error, { appointmentId })
    return false
  }
}

/**
 * Get reminder status for an appointment
 */
export async function getReminderStatus(appointmentId: string): Promise<{
  scheduled: number
  sent: number
  failed: number
  pending: number
}> {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) FILTER(WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER(WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER(WHERE status = 'pending') as pending_count,
        COUNT(*) as total_count
       FROM sms_reminders
       WHERE appointment_id = $1`,
      [appointmentId]
    )

    const stats = result.rows[0]
    return {
      scheduled: parseInt(stats.total_count) || 0,
      sent: parseInt(stats.sent_count) || 0,
      failed: parseInt(stats.failed_count) || 0,
      pending: parseInt(stats.pending_count) || 0,
    }
  } catch (error) {
    schedulerLogger.error('Error getting reminder status', error, { appointmentId })
    return {
      scheduled: 0,
      sent: 0,
      failed: 0,
      pending: 0,
    }
  }
}

export default {
  scheduleRemindersSMS,
  sendBookingConfirmationSMS,
  sendCancellationSMS,
  getReminderStatus,
}
