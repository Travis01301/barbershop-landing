import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'
import { passwordService } from '@/lib/password-service'
import { loginLimiter } from '@/lib/rate-limiter'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const authLogger = logger.createChild('auth-login')

const LoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 * Rate limited: 5 attempts per 15 minutes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(LoginSchema, body, 'login')
    if (!validation.success) {
      authLogger.warn('Login validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password } = validation.data!

    // Rate limiting by email
    const rateLimitCheck = loginLimiter.isAllowed(email)
    if (!rateLimitCheck.allowed) {
      authLogger.warn('Login rate limit exceeded', {
        email,
        resetAt: new Date(rateLimitCheck.resetAt),
      })
      return NextResponse.json(
        {
          error: 'Too many login attempts. Try again later.',
          resetAt: new Date(rateLimitCheck.resetAt).toISOString(),
        },
        { status: 429 }
      )
    }

    authLogger.debug('Login attempt', { email })

    // Query user by email
    const userResult = await query(
      `SELECT id, email, password_hash, role, shop_id, created_at
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    )

    if (userResult.rowCount === 0) {
      authLogger.warn('Login failed - user not found', { email })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = userResult.rows[0]

    // Verify password
    const passwordValid = await passwordService.verifyPassword(
      password,
      user.password_hash
    )

    if (!passwordValid) {
      authLogger.warn('Login failed - invalid password', { email })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if password needs rehashing (bcrypt cost increased)
    const needsRehash = await passwordService.needsRehashing(user.password_hash)
    if (needsRehash) {
      authLogger.info('Password rehash needed', { userId: user.id })
      const newHash = await passwordService.hashPassword(password)
      await query(
        `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newHash, user.id]
      )
    }

    // Check if 2FA is enabled
    const twoFactorResult = await query(
      `SELECT is_enabled, method FROM user_two_factor_settings
       WHERE user_id = $1 AND shop_id = $2`,
      [user.id, user.shop_id]
    )

    if (twoFactorResult.rowCount > 0 && twoFactorResult.rows[0].is_enabled) {
      // 2FA is enabled - return 2FA required response
      const { method } = twoFactorResult.rows[0]

      // Send SMS code if SMS method
      let attemptId: string | null = null
      if (method === 'sms') {
        // Get phone number
        const phoneResult = await query(
          `SELECT phone_number FROM user_two_factor_settings WHERE user_id = $1`,
          [user.id]
        )

        if (phoneResult.rowCount > 0 && phoneResult.rows[0].phone_number) {
          const { twoFactorService } = await import('@/lib/two-factor-service')
          const smsResult = await twoFactorService.generateAndSendSMSCode(
            user.id,
            user.shop_id,
            phoneResult.rows[0].phone_number
          )
          attemptId = smsResult.attemptId
        }
      }

      authLogger.info('2FA required for login', {
        userId: user.id,
        email,
        method,
      })

      return NextResponse.json({
        success: false,
        requiresTwoFactor: true,
        userId: user.id,
        method,
        attemptId,
        message: method === 'sms' ? 'SMS code sent to registered phone number' : 'Enter your authenticator code',
      })
    }

    // No 2FA - generate JWT tokens normally
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

    authLogger.info('Login successful', {
      userId: user.id,
      email,
      role: user.role,
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
    authLogger.error('Login error', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
