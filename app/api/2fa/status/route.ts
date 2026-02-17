import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'

const twoFactorLogger = logger.createChild('2fa-status')

/**
 * GET /api/2fa/status
 * Check 2FA status for current user
 */
export async function GET(request: NextRequest) {
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

    // Get 2FA status
    const status = await twoFactorService.get2FAStatus(userId, shopId)

    twoFactorLogger.debug('2FA status retrieved', { userId, shopId })

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    twoFactorLogger.error('Get 2FA status error', error)
    return NextResponse.json({ error: 'Failed to get 2FA status' }, { status: 500 })
  }
}
