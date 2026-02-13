import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { z } from 'zod'

const authLogger = logger.createChild('auth-refresh')

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
})

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = RefreshSchema.parse(body)

    authLogger.debug('Token refresh attempt')

    const tokens = await jwtAuth.refreshAccessToken(refreshToken)

    authLogger.info('Token refreshed successfully')

    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      authLogger.warn('Refresh validation failed', { errors: error.errors })
      return NextResponse.json(
        { error: 'Validation failed' },
        { status: 400 }
      )
    }

    authLogger.warn('Token refresh failed', error)
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    )
  }
}
