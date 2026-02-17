#!/usr/bin/env node
/**
 * Direct Node.js execution of reminder workflow
 * Bypasses ts-node complexity
 */

import 'dotenv/config'
import pkg from 'pg'
const { Pool } = pkg
import * as fs from 'fs'
import * as https from 'https'

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Simple logger
const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, err, data) => console.error(`[ERROR] ${msg}`, err?.message, data ? JSON.stringify(data) : ''),
}

/**
 * Send reminder email via Resend
 */
async function sendReminderEmail(email, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@barbershopsaas.com',
      to: email,
      subject: `Reminder: Your appointment with ${data.barberName} tomorrow`,
      html: `
        <h2>Appointment Reminder</h2>
        <p>Hi ${data.customerName},</p>
        <p>Just a reminder that you have an appointment coming up!</p>
        <ul>
          <li><strong>Barber:</strong> ${data.barberName}</li>
          <li><strong>Shop:</strong> ${data.shopName}</li>
          <li><strong>Time:</strong> ${data.appointmentTime}</li>
          <li><strong>Service:</strong> ${data.serviceType}</li>
        </ul>
        <p>See you soon!</p>
      `,
    })

    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => (responseData += chunk))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData))
        } else {
          reject(new Error(`Resend API error: ${res.statusCode}`))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * Get appointments due for reminders
 */
async function getAppointmentsDueForReminders() {
  const now = new Date()
  const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
  const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

  const result = await pool.query(
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

  logger.info('Found appointments due for reminders', {
    count: result.rows.length,
    reminderWindow: { start: reminderWindowStart.toISOString(), end: reminderWindowEnd.toISOString() },
  })

  return result.rows.map(row => ({
    appointmentId: row.appointment_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    barberName: row.barber_name,
    shopName: row.shop_name,
    startTime: new Date(row.start_time),
    serviceType: row.service_type,
  }))
}

/**
 * Send reminders and mark appointments
 */
async function sendReminderEmails(reminders) {
  let sent = 0
  let failed = 0

  for (const reminder of reminders) {
    try {
      const appointmentTime = reminder.startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      // Send email
      await sendReminderEmail(reminder.customerEmail, {
        customerName: reminder.customerName,
        barberName: reminder.barberName,
        shopName: reminder.shopName,
        appointmentTime: appointmentTime,
        serviceType: reminder.serviceType,
      })

      // Mark as reminded
      await pool.query(
        `UPDATE appointments 
         SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reminder.appointmentId]
      )

      sent++
      logger.info('Reminder sent successfully', {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      })
    } catch (error) {
      failed++
      logger.error('Failed to send reminder', error, {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      })
    }
  }

  logger.info('Reminder batch completed', { sent, failed, total: reminders.length })
  return { sent, failed }
}

/**
 * Main workflow
 */
async function main() {
  try {
    logger.info('Starting 24-hour appointment reminder workflow')

    const reminders = await getAppointmentsDueForReminders()
    const results = await sendReminderEmails(reminders)

    const summary = {
      found: reminders.length,
      sent: results.sent,
      failed: results.failed,
    }

    console.log('\n=== 24-Hour Appointment Reminders ===')
    console.log(`Appointments found: ${summary.found}`)
    console.log(`Reminders sent: ${summary.sent}`)
    console.log(`Failed: ${summary.failed}`)
    console.log(`Success rate: ${summary.found > 0 ? ((summary.sent / summary.found) * 100).toFixed(1) : 'N/A'}%`)
    console.log(`\nWorkflow completed at ${new Date().toISOString()}`)

    await pool.end()
    process.exit(summary.failed === 0 && summary.found === summary.sent ? 0 : 1)
  } catch (error) {
    logger.error('Reminder workflow failed', error)
    console.error('WORKFLOW ERROR:', error.message)
    await pool.end()
    process.exit(1)
  }
}

main()
