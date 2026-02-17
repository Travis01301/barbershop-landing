import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'

const twoFactorLogger = logger.createChild('2fa-confirm')

/**
 * POST /api/2fa/confirm-2fa
 * Confirm and activate 2FA after setup (SMS verification or authenticator code)
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

    // Confirm 2FA
    const result = await twoFactorService.confirm2FA(userId, shopId)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, '2fa_enabled', true)

    twoFactorLogger.info('2FA confirmed and enabled', { userId, shopId })

    return NextResponse.json(result)
  } catch (error) {
    twoFactorLogger.error('Confirm 2FA error', error)
    return NextResponse.json({ error: 'Failed to confirm 2FA' }, { status: 500 })
  }
}
