import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-verify-authenticator')

const VerifyAuthenticatorSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

/**
 * POST /api/2fa/verify-authenticator
 * Verify authenticator app code during setup
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
    const validation = validateInput(VerifyAuthenticatorSchema, body, '2fa-verify-authenticator')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { code } = validation.data!

    // Verify TOTP code
    const result = await twoFactorService.verifyTOTPCode(userId, shopId, code)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, 'authenticator_code_verified', result.success)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    twoFactorLogger.info('Authenticator code verified', { userId, shopId })

    return NextResponse.json(result)
  } catch (error) {
    twoFactorLogger.error('Verify authenticator error', error)
    return NextResponse.json({ error: 'Failed to verify authenticator code' }, { status: 500 })
  }
}
