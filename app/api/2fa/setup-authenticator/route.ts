import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { query } from '@/lib/db'

const twoFactorLogger = logger.createChild('2fa-setup-authenticator')

/**
 * POST /api/2fa/setup-authenticator
 * Get QR code and secret for authenticator app setup
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

    // Get user email for QR code
    const userResult = await query(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    )

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userEmail = userResult.rows[0].email

    // Setup authenticator
    const result = await twoFactorService.setupAuthenticator(userId, shopId, userEmail)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, 'authenticator_setup_initiated', true)

    twoFactorLogger.info('Authenticator setup initiated', { userId, shopId })

    return NextResponse.json({
      success: true,
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
      manual_entry_key: result.secret,
    })
  } catch (error) {
    twoFactorLogger.error('Setup authenticator error', error)
    return NextResponse.json({ error: 'Failed to setup authenticator' }, { status: 500 })
  }
}
