#!/usr/bin/env ts-node
/**
 * Standalone script to execute 24-hour appointment reminders
 * Called by cron job to find and email upcoming appointments
 */

import 'dotenv/config'
import { executeReminderWorkflow } from './lib/reminder-service'
import { logger } from './lib/logger'

const cronLogger = logger.createChild('reminder-cron')

async function main() {
  try {
    cronLogger.info('Starting 24-hour appointment reminder cron job')
    
    const results = await executeReminderWorkflow()
    
    console.log(`\n=== 24-Hour Appointment Reminders ===`)
    console.log(`Appointments found: ${results.found}`)
    console.log(`Reminders sent: ${results.sent}`)
    console.log(`Failed: ${results.failed}`)
    console.log(`Success rate: ${results.found > 0 ? ((results.sent / results.found) * 100).toFixed(1) : 'N/A'}%`)
    console.log(`\nWorkflow completed at ${new Date().toISOString()}`)
    
    process.exit(results.failed === 0 && results.found === results.sent ? 0 : 1)
  } catch (error) {
    cronLogger.error('Cron job failed', error)
    console.error('CRON ERROR:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
