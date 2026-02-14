import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { smsService } from '@/lib/sms-service'
import { logger } from '@/lib/logger'

const remindersLogger = logger.createChild('api.sms.send-reminders')

/**
 * POST /api/sms/send-reminders
 * Send pending SMS reminders (24-hour and day-of)
 * Can be called by a cron job or manually
 * Requires a secret token for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      remindersLogger.warn('Invalid cron secret provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending 24-hour reminders
    const reminders24h = await query(
      `SELECT 
        sr.id, sr.appointment_id, sr.customer_phone,
        a.customer_name, a.start_time, u.name as barber_name, s.name as shop_name, s.phone as shop_phone
       FROM sms_reminders sr
       JOIN appointments a ON sr.appointment_id = a.id
       LEFT JOIN users u ON a.barber_id = u.id
       JOIN shops s ON a.shop_id = s.id
       WHERE sr.reminder_type = '24h' 
         AND sr.status = 'pending'
         AND sr.scheduled_for <= NOW()
         AND a.status = 'confirmed'
       LIMIT 100`,
      []
    )

    remindersLogger.info('Found pending 24h reminders', { count: reminders24h.rowCount })

    // Send 24-hour reminders
    for (const reminder of reminders24h.rows) {
      try {
        const appointmentTime = new Date(reminder.start_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })

        const success = await smsService.send24hReminder({
          customerName: reminder.customer_name,
          customerPhone: reminder.customer_phone,
          barberName: reminder.barber_name || 'Your barber',
          appointmentTime,
          shopName: reminder.shop_name,
          shopPhone: reminder.shop_phone,
        })

        // Update reminder status
        const status = success ? 'sent' : 'failed'
        await query(
          `UPDATE sms_reminders 
           SET status = $1, sent_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [status, reminder.id]
        )

        remindersLogger.info('24h reminder processed', {
          reminderId: reminder.id,
          appointmentId: reminder.appointment_id,
          status,
        })
      } catch (error) {
        remindersLogger.error('Error sending 24h reminder', error, {
          reminderId: reminder.id,
        })

        // Mark as failed
        await query(
          `UPDATE sms_reminders 
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [error instanceof Error ? error.message : 'Unknown error', reminder.id]
        )
      }
    }

    // Get pending day-of reminders
    const remindersDayOf = await query(
      `SELECT 
        sr.id, sr.appointment_id, sr.customer_phone,
        a.customer_name, a.start_time, u.name as barber_name, s.name as shop_name
       FROM sms_reminders sr
       JOIN appointments a ON sr.appointment_id = a.id
       LEFT JOIN users u ON a.barber_id = u.id
       JOIN shops s ON a.shop_id = s.id
       WHERE sr.reminder_type = 'day_of' 
         AND sr.status = 'pending'
         AND sr.scheduled_for <= NOW()
         AND a.status = 'confirmed'
       LIMIT 100`,
      []
    )

    remindersLogger.info('Found pending day-of reminders', { count: remindersDayOf.rowCount })

    // Send day-of reminders
    for (const reminder of remindersDayOf.rows) {
      try {
        const appointmentTime = new Date(reminder.start_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })

        const success = await smsService.sendDayOfReminder({
          customerName: reminder.customer_name,
          customerPhone: reminder.customer_phone,
          barberName: reminder.barber_name || 'Your barber',
          appointmentTime,
          shopName: reminder.shop_name,
        })

        // Update reminder status
        const status = success ? 'sent' : 'failed'
        await query(
          `UPDATE sms_reminders 
           SET status = $1, sent_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [status, reminder.id]
        )

        remindersLogger.info('Day-of reminder processed', {
          reminderId: reminder.id,
          appointmentId: reminder.appointment_id,
          status,
        })
      } catch (error) {
        remindersLogger.error('Error sending day-of reminder', error, {
          reminderId: reminder.id,
        })

        // Mark as failed
        await query(
          `UPDATE sms_reminders 
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [error instanceof Error ? error.message : 'Unknown error', reminder.id]
        )
      }
    }

    const totalProcessed = reminders24h.rowCount + remindersDayOf.rowCount
    remindersLogger.info('Reminder processing complete', {
      reminders24h: reminders24h.rowCount,
      remindersDayOf: remindersDayOf.rowCount,
      totalProcessed,
    })

    return NextResponse.json({
      success: true,
      message: 'Reminders processed',
      stats: {
        reminders24h: reminders24h.rowCount,
        remindersDayOf: remindersDayOf.rowCount,
        totalProcessed,
      },
    })
  } catch (error) {
    remindersLogger.error('Error processing reminders', error)
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    )
  }
}
