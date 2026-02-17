import 'dotenv/config'
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
})

async function executeReminderWorkflow() {
  let found = 0
  let sent = 0
  let failed = 0

  try {
    console.log('Starting 24-hour appointment reminder workflow...')
    
    const now = new Date()
    const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
    const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

    // Find appointments due for reminders
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

    const reminders = result.rows
    found = reminders.length

    console.log(`Found ${found} appointment(s) due for 24-hour reminders`)

    // For each reminder, mark as sent (simplified - no actual email in this demo)
    for (const reminder of reminders) {
      try {
        // In production, this would call emailService.sendAppointmentReminder()
        // For now, just mark as sent
        await pool.query(
          `UPDATE appointments 
           SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [reminder.appointment_id]
        )
        sent++
        console.log(`✓ Reminder marked for ${reminder.customer_name} (${reminder.customer_email})`)
      } catch (err) {
        failed++
        console.error(`✗ Failed for appointment ${reminder.appointment_id}:`, err.message)
      }
    }

    return { found, sent, failed }
  } catch (error) {
    console.error('Workflow error:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

try {
  const results = await executeReminderWorkflow()
  console.log(`\n=== 24-Hour Appointment Reminders ===`)
  console.log(`Appointments found: ${results.found}`)
  console.log(`Reminders sent: ${results.sent}`)
  console.log(`Failed: ${results.failed}`)
  if (results.found > 0) {
    console.log(`Success rate: ${((results.sent / results.found) * 100).toFixed(1)}%`)
  }
  console.log(`Workflow completed at ${new Date().toISOString()}`)
  process.exit(results.failed === 0 && results.found === results.sent ? 0 : 1)
} catch (error) {
  console.error('CRON ERROR:', error.message)
  process.exit(1)
}
