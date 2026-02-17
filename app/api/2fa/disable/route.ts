import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { passwordService } from '@/lib/password-service'
import { query } from '@/lib/db'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-disable')

const DisableSchema = z.object({
  password: z.string().min(1, 'Password required'),
})

/**
 * POST /api/2fa/disable
 * Disable 2FA (requires current password for security)
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
    const validation = validateInput(DisableSchema, body, '2fa-disable')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { password } = validation.data!

    // Get user and verify password
    const userResult = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    )

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordValid = await passwordService.verifyPassword(
      password,
      userResult.rows[0].password_hash
    )

    if (!passwordValid) {
      await twoFactorService.log2FAEvent(userId, shopId, '2fa_disable_failed', false, {
        reason: 'Invalid password',
      })

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Disable 2FA
    const result = await twoFactorService.disable2FA(userId, shopId)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, '2fa_disabled', true)

    twoFactorLogger.info('2FA disabled', { userId, shopId })

    return NextResponse.json(result)
  } catch (error) {
    twoFactorLogger.error('Disable 2FA error', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
