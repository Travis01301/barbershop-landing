import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'
import { passwordService } from '@/lib/password-service'
import { signupLimiter } from '@/lib/rate-limiter'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const authLogger = logger.createChild('auth-signup')

const SignupSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string(),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name required'),
  role: z.enum(['customer', 'barber'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
  shopId: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * POST /api/auth/signup
 * Create new user account
 * Rate limited: 3 attempts per hour
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(SignupSchema, body, 'signup')
    if (!validation.success) {
      authLogger.warn('Signup validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, password, name, role, shopId } = validation.data!

    // Rate limiting by IP (could use request.ip)
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitCheck = signupLimiter.isAllowed(clientIp)
    if (!rateLimitCheck.allowed) {
      authLogger.warn('Signup rate limit exceeded', {
        ip: clientIp,
        resetAt: new Date(rateLimitCheck.resetAt),
      })
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Try again later.',
          resetAt: new Date(rateLimitCheck.resetAt).toISOString(),
        },
        { status: 429 }
      )
    }

    authLogger.debug('Signup attempt', { email, name, role })

    // Validate password strength
    const passwordError = passwordService.validatePasswordStrength(password)
    if (passwordError) {
      authLogger.warn('Weak password', { email })
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    )

    if (existingUser.rowCount > 0) {
      authLogger.warn('Email already registered', { email })
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // For barbers, verify shopId exists
    if (role === 'barber' && shopId) {
      const shopResult = await query(
        `SELECT id FROM shops WHERE id = $1`,
        [shopId]
      )
      if (shopResult.rowCount === 0) {
        authLogger.warn('Shop not found', { shopId })
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        )
      }
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(password)

    // Create user
    const userId = uuidv4()
    const userResult = await query(
      `INSERT INTO users (
        id, email, password_hash, name, role, shop_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, role, shop_id`,
      [userId, email, passwordHash, name, role, shopId || null]
    )

    const newUser = userResult.rows[0]

    // Generate JWT tokens
    const tokens = await jwtAuth.generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      shopId: newUser.shop_id,
    })

    authLogger.info('User registered successfully', {
      userId: newUser.id,
      email,
      role,
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name,
          role,
          shopId: newUser.shop_id,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
      { status: 201 }
    )
  } catch (error) {
    authLogger.error('Signup error', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}
