import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-verify-login')

const VerifyLoginSchema = z.object({
  userId: z.string().uuid(),
  method: z.enum(['sms', 'totp', 'backup']),
  code: z.string(),
  attemptId: z.string().optional(),
})

/**
 * POST /api/2fa/verify-login
 * Verify 2FA code during login (called after successful password verification)
 * This endpoint issues the JWT tokens after successful 2FA verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(VerifyLoginSchema, body, '2fa-verify-login')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { userId, method, code, attemptId } = validation.data!

    // Get user details
    const userResult = await query(
      `SELECT id, email, role, shop_id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    )

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]
    const shopId = user.shop_id

    // Check if 2FA is enabled
    const settingsResult = await query(
      `SELECT is_enabled, method as 2fa_method FROM user_two_factor_settings
       WHERE user_id = $1 AND shop_id = $2`,
      [userId, shopId]
    )

    if (settingsResult.rowCount === 0 || !settingsResult.rows[0].is_enabled) {
      return NextResponse.json(
        { error: '2FA not enabled for user' },
        { status: 400 }
      )
    }

    let verificationSuccess = false
    let verificationMessage = ''

    if (method === 'backup') {
      // Verify backup code
      const backupResult = await twoFactorService.verifyBackupCode(userId, shopId, code)
      verificationSuccess = backupResult.success
      verificationMessage = backupResult.message || 'Backup code verified'
    } else if (method === 'sms') {
      // Verify SMS code
      if (!attemptId) {
        return NextResponse.json({ error: 'Attempt ID required for SMS' }, { status: 400 })
      }
      const smsResult = await twoFactorService.verifySMSCode(userId, shopId, attemptId, code)
      verificationSuccess = smsResult.success
      verificationMessage = smsResult.message || 'SMS code verified'
    } else if (method === 'totp') {
      // Verify TOTP code
      const totpResult = await twoFactorService.verify2FAForLogin(userId, shopId, code)
      verificationSuccess = totpResult.success
      verificationMessage = totpResult.message || 'Authenticator code verified'
    }

    if (!verificationSuccess) {
      await twoFactorService.log2FAEvent(userId, shopId, '2fa_login_failed', false, {
        method,
      })

      return NextResponse.json(
        { error: verificationMessage || 'Failed to verify 2FA code' },
        { status: 400 }
      )
    }

    // Generate JWT tokens (2FA verified)
    const tokens = await jwtAuth.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shop_id,
    })

    // Update last login
    await query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    )

    // Log successful 2FA login
    await twoFactorService.log2FAEvent(userId, shopId, '2fa_login_success', true, {
      method,
    })

    twoFactorLogger.info('2FA login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      method,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        shopId: user.shop_id,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })
  } catch (error) {
    twoFactorLogger.error('2FA login verification error', error)
    return NextResponse.json(
      { error: '2FA verification failed' },
      { status: 500 }
    )
  }
}
