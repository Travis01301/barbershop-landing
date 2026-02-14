import { query } from './db'
import { emailService } from './email-service'
import { logger } from './logger'

const reminderLogger = logger.createChild('reminder-service')

export interface AppointmentReminder {
  appointmentId: string
  customerEmail: string
  customerName: string
  barberName: string
  shopName: string
  startTime: Date
  serviceType: string
}

/**
 * Get appointments due for 24-hour reminders
 * Returns appointments that:
 * - Start in ~24 hours (between 23.5 and 24.5 hours from now)
 * - Have confirmed status
 * - Haven't already been reminded
 */
export async function getAppointmentsDueForReminders(): Promise<AppointmentReminder[]> {
  try {
    const now = new Date()
    const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000) // 23.5 hours
    const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000) // 24.5 hours

    const result = await query(
      `SELECT 
        a.id as appointment_id,
        c.email as customer_email,
        c.name as customer_name,
        b.name as barber_name,
        s.name as shop_name,
        a.start_time as start_time,
        a.service_type as service_type
       FROM appointments a
       JOIN customers c ON a.customer_id = c.id
       JOIN barbers b ON a.barber_id = b.id
       JOIN shops s ON a.shop_id = s.id
       WHERE a.status = $1
         AND a.start_time > $2
         AND a.start_time < $3
         AND a.reminder_sent_at IS NULL
       ORDER BY a.start_time ASC`,
      ['confirmed', reminderWindowStart, reminderWindowEnd]
    )

    const reminders = result.rows.map(row => ({
      appointmentId: row.appointment_id,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      barberName: row.barber_name,
      shopName: row.shop_name,
      startTime: new Date(row.start_time),
      serviceType: row.service_type,
    }))

    reminderLogger.info('Found appointments due for reminders', {
      count: reminders.length,
      reminderWindow: { start: reminderWindowStart, end: reminderWindowEnd },
    })

    return reminders
  } catch (error) {
    reminderLogger.error('Error fetching appointments for reminders', error)
    throw error
  }
}

/**
 * Send 24-hour reminder emails
 * Marks appointment as reminded after successful send
 */
export async function sendReminderEmails(
  reminders: AppointmentReminder[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    try {
      // Format appointment time
      const appointmentTime = reminder.startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
      })

      // Send email
      await emailService.sendAppointmentReminder({
        customerEmail: reminder.customerEmail,
        customerName: reminder.customerName,
        barberName: reminder.barberName,
        shopName: reminder.shopName,
        appointmentTime: appointmentTime,
        serviceType: reminder.serviceType,
      })

      // Mark as reminded
      await query(
        `UPDATE appointments 
         SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reminder.appointmentId]
      )

      sent++
      reminderLogger.info('Reminder sent successfully', {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      })
    } catch (error) {
      failed++
      reminderLogger.error('Failed to send reminder', error, {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      })
    }
  }

  reminderLogger.info('Reminder batch completed', {
    sent,
    failed,
    total: reminders.length,
  })

  return { sent, failed }
}

/**
 * Execute full reminder workflow
 * 1. Find appointments due for reminders
 * 2. Send emails
 * 3. Return summary
 */
export async function executeReminderWorkflow(): Promise<{
  found: number
  sent: number
  failed: number
}> {
  try {
    reminderLogger.info('Starting 24-hour reminder workflow')

    const reminders = await getAppointmentsDueForReminders()
    const results = await sendReminderEmails(reminders)

    const summary = {
      found: reminders.length,
      sent: results.sent,
      failed: results.failed,
    }

    reminderLogger.info('Reminder workflow completed', summary)
    return summary
  } catch (error) {
    reminderLogger.error('Reminder workflow failed', error)
    throw error
  }
}
