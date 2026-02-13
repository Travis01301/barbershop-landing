import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'

const authLogger = logger.createChild('auth-logout')

/**
 * Token blacklist (in-memory for single instance)
 * For distributed systems, use Redis
 */
const tokenBlacklist = new Set<string>()

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  authLogger.debug('Cleaning up token blacklist', { size: tokenBlacklist.size })
  // In production, you'd query the database for expired tokens and remove them
}, 5 * 60 * 1000)

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token)
}

/**
 * POST /api/auth/logout
 * Invalidate user session
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = jwtAuth.extractToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      )
    }

    // Verify token is valid before blacklisting
    let user
    try {
      user = await jwtAuth.verifyAccessToken(token)
    } catch {
      authLogger.warn('Logout with invalid token')
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Add token to blacklist
    tokenBlacklist.add(token)

    // Optional: Store in database for persistence across restarts
    await query(
      `INSERT INTO blacklisted_tokens (token, user_id, expires_at, created_at)
       VALUES ($1, $2, to_timestamp($3), CURRENT_TIMESTAMP)
       ON CONFLICT (token) DO NOTHING`,
      [token, user.userId, user.exp || 0]
    ).catch(error => {
      // Table might not exist, log but don't fail
      authLogger.debug('Could not store token in database', error)
    })

    authLogger.info('User logged out', {
      userId: user.userId,
      email: user.email,
    })

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    authLogger.error('Logout error', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/logout
 * Alternative GET endpoint for simple logout links
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
