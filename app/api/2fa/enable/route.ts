import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-enable')

const EnableSchema = z.object({
  method: z.enum(['sms', 'totp']),
  phoneNumber: z.string().optional(),
})

/**
 * POST /api/2fa/enable
 * Start 2FA setup process (choose SMS or Authenticator)
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and verify JWT
    const authHeader = request.headers.get('Authorization')
    const token = jwtAuth.extractToken(authHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await jwtAuth.verifyAccessToken(token)
    const userId = payload.userId
    const shopId = payload.shopId

    if (!userId || !shopId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = validateInput(EnableSchema, body, '2fa-enable')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { method, phoneNumber } = validation.data!

    // Validate phone number for SMS method
    if (method === 'sms' && !phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number required for SMS method' },
        { status: 400 }
      )
    }

    // Enable 2FA
    const result = await twoFactorService.enable2FA(userId, shopId, method)

    // If SMS, store phone number
    if (method === 'sms' && phoneNumber) {
      // Store phone number in settings
      const { query } = await import('@/lib/db')
      await query(
        `UPDATE user_two_factor_settings 
         SET phone_number = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND shop_id = $3`,
        [phoneNumber, userId, shopId]
      )
    }

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, '2fa_enable_started', true, { method })

    twoFactorLogger.info('2FA enable started', { userId, shopId, method })

    return NextResponse.json({
      success: true,
      settings: result.settings,
    })
  } catch (error) {
    twoFactorLogger.error('Enable 2FA error', error)
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
  }
}
