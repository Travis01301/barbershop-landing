import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { executeReminderWorkflow } from '@/lib/reminder-service'

const reminderApiLogger = logger.createChild('reminder-api')

/**
 * POST /api/reminders/send
 * Trigger 24-hour appointment reminders
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = jwtAuth.extractToken(authHeader)

    if (!token) {
      reminderApiLogger.warn('Reminder endpoint called without auth')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await jwtAuth.verifyAccessToken(token)

    // Only admins can trigger reminders manually
    if (user.role !== 'admin') {
      reminderApiLogger.warn('Non-admin attempted to trigger reminders', {
        userId: user.userId,
        role: user.role,
      })
      return NextResponse.json(
        { error: 'Forbidden - admin only' },
        { status: 403 }
      )
    }

    reminderApiLogger.info('Reminder workflow triggered', { userId: user.userId })

    // Execute reminder workflow
    const results = await executeReminderWorkflow()

    return NextResponse.json({
      success: true,
      message: `Reminders sent: ${results.sent}/${results.found}`,
      results,
    })
  } catch (error) {
    reminderApiLogger.error('Reminder endpoint error', error)
    return NextResponse.json(
      {
        error: 'Failed to send reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reminders/send
 * Health check / status endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/reminders/send',
    method: 'POST',
    requires: 'JWT auth (admin role)',
    description: 'Trigger 24-hour appointment reminders',
    usage: 'Typically called via cron job every hour',
  })
}
