#!/usr/bin/env node

/**
 * Direct reminder execution (bypasses API)
 * Runs the reminder workflow directly using the reminder service
 */

require('dotenv').config();
import { executeReminderWorkflow } from './lib/reminder-service';

async function runReminders() {
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

runReminders();
