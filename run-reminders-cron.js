#!/usr/bin/env node

/**
 * Direct reminder execution script for cron jobs
 * No API authentication required - uses reminder-service directly
 */

require('dotenv').config();

// Import the built reminder service
const path = require('path');
const { query } = require('./lib/db');
const { emailService } = require('./lib/email-service');
const { logger } = require('./lib/logger');

const reminderLogger = logger.createChild('reminder-service');

/**
 * Get appointments due for 24-hour reminders
 */
async function getAppointmentsDueForReminders() {
  try {
    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

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
    );

    const reminders = result.rows.map(row => ({
      appointmentId: row.appointment_id,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      barberName: row.barber_name,
      shopName: row.shop_name,
      startTime: new Date(row.start_time),
      serviceType: row.service_type,
    }));

    reminderLogger.info('Found appointments due for reminders', {
      count: reminders.length,
      reminderWindow: { start: reminderWindowStart, end: reminderWindowEnd },
    });

    return reminders;
  } catch (error) {
    reminderLogger.error('Error fetching appointments for reminders', error);
    throw error;
  }
}

/**
 * Send 24-hour reminder emails
 */
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

      await emailService.sendAppointmentReminder({
        customerEmail: reminder.customerEmail,
        customerName: reminder.customerName,
        barberName: reminder.barberName,
        shopName: reminder.shopName,
        appointmentTime: appointmentTime,
        serviceType: reminder.serviceType,
      });

      await query(
        `UPDATE appointments 
         SET reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reminder.appointmentId]
      );

      sent++;
      reminderLogger.info('Reminder sent successfully', {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      });
    } catch (error) {
      failed++;
      reminderLogger.error('Failed to send reminder', error, {
        appointmentId: reminder.appointmentId,
        customerEmail: reminder.customerEmail,
      });
    }
  }

  reminderLogger.info('Reminder batch completed', {
    sent,
    failed,
    total: reminders.length,
  });

  return { sent, failed };
}

/**
 * Execute full reminder workflow
 */
async function executeReminderWorkflow() {
  try {
    reminderLogger.info('Starting 24-hour reminder workflow');

    const reminders = await getAppointmentsDueForReminders();
    const results = await sendReminderEmails(reminders);

    const summary = {
      found: reminders.length,
      sent: results.sent,
      failed: results.failed,
    };

    reminderLogger.info('Reminder workflow completed', summary);
    return summary;
  } catch (error) {
    reminderLogger.error('Reminder workflow failed', error);
    throw error;
  }
}

async function main() {
  console.log('🔔 Starting 24-hour reminder workflow...');
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    const results = await executeReminderWorkflow();

    console.log('\n✅ Reminders executed successfully');
    console.log(`   Found: ${results.found}`);
    console.log(`   Sent: ${results.sent}`);
    console.log(`   Failed: ${results.failed}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running reminders:', error);
    process.exit(1);
  }
}

main();
