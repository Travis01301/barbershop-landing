import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const authLogger = logger.createChild('auth-login')

const LoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
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

    authLogger.debug('Login attempt', { email })

    // TODO: In production, implement proper password hashing (bcrypt)
    // For now, this is a placeholder
    // In real implementation:
    // 1. Query user by email
    // 2. Compare password hash using bcrypt.compare()
    // 3. Return error if no match

    // Placeholder: reject all logins
    authLogger.warn('Login failed - password validation not implemented', { email })
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error) {
    authLogger.error('Login error', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
