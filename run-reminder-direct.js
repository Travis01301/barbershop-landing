#!/usr/bin/env node

/**
 * Direct reminder workflow execution
 * Runs the 24-hour appointment reminder workflow without HTTP/auth
 */

require('dotenv').config();
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY,
  },
});

async function getAppointmentsDueForReminders() {
  const now = new Date();
  const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000); // 23.5 hours
  const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000); // 24.5 hours

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
  );

  return result.rows.map(row => ({
    appointmentId: row.appointment_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    barberName: row.barber_name,
    shopName: row.shop_name,
    startTime: new Date(row.start_time),
    serviceType: row.service_type,
  }));
}

async function sendReminderEmails(reminders) {
  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const appointmentTime = reminder.startTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        meridiem: 'short',
      });

      // Send email via Resend
      const emailContent = `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h2>Appointment Reminder</h2>
            <p>Hi ${reminder.customerName},</p>
            <p>This is a reminder that you have an appointment tomorrow:</p>
            <ul>
              <li><strong>Barber:</strong> ${reminder.barberName}</li>
              <li><strong>Shop:</strong> ${reminder.shopName}</li>
              <li><strong>Time:</strong> ${appointmentTime}</li>
              <li><strong>Service:</strong> ${reminder.serviceType}</li>
            </ul>
            <p>Please arrive a few minutes early. If you need to cancel, please do so as soon as possible.</p>
            <p>Thank you!</p>
          </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Dev@barbershopmvp.com',
        to: reminder.customerEmail,
        subject: `Appointment Reminder - ${appointmentTime}`,
        html: emailContent,
      });

      // Mark as reminded
      await pool.query(
        `UPDATE appointments 
         SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reminder.appointmentId]
      );

      sent++;
      console.log(`✓ Reminder sent to ${reminder.customerEmail}`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to send reminder to ${reminder.customerEmail}:`, error.message);
    }
  }

  return { sent, failed };
}

async function executeReminderWorkflow() {
  try {
    console.log('Starting 24-hour appointment reminder workflow...\n');

    const reminders = await getAppointmentsDueForReminders();
    console.log(`Found ${reminders.length} appointments due for reminders\n`);

    const results = await sendReminderEmails(reminders);

    return {
      found: reminders.length,
      sent: results.sent,
      failed: results.failed,
    };
  } catch (error) {
    console.error('Workflow error:', error);
    throw error;
  }
}

async function main() {
  try {
    const results = await executeReminderWorkflow();

    console.log(`\n=== 24-Hour Appointment Reminders ===`);
    console.log(`Appointments found: ${results.found}`);
    console.log(`Reminders sent: ${results.sent}`);
    console.log(`Failed: ${results.failed}`);
    if (results.found > 0) {
      console.log(`Success rate: ${((results.sent / results.found) * 100).toFixed(1)}%`);
    }
    console.log(`\nWorkflow completed at ${new Date().toISOString()}`);

    process.exit(results.failed === 0 && results.found === results.sent ? 0 : 1);
  } catch (error) {
    console.error('CRON ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
