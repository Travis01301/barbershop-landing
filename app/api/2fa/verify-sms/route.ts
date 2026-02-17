import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-verify-sms')

const VerifySMSSchema = z.object({
  action: z.enum(['send', 'verify']),
  phoneNumber: z.string().optional(),
  code: z.string().optional(),
  attemptId: z.string().optional(),
})

/**
 * POST /api/2fa/verify-sms
 * Send SMS code or verify SMS code
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
    const validation = validateInput(VerifySMSSchema, body, '2fa-verify-sms')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { action, phoneNumber, code, attemptId } = validation.data!

    if (action === 'send') {
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
      }

      // Generate and send SMS code
      const result = await twoFactorService.generateAndSendSMSCode(userId, shopId, phoneNumber)

      // Log audit event
      await twoFactorService.log2FAEvent(userId, shopId, 'sms_code_sent', true)

      twoFactorLogger.info('SMS code sent', { userId, shopId })

      return NextResponse.json(result)
    } else if (action === 'verify') {
      if (!code || !attemptId) {
        return NextResponse.json(
          { error: 'Code and attemptId required' },
          { status: 400 }
        )
      }

      // Verify SMS code
      const result = await twoFactorService.verifySMSCode(userId, shopId, attemptId, code)

      // Log audit event
      await twoFactorService.log2FAEvent(userId, shopId, 'sms_code_verified', result.success)

      if (!result.success) {
        return NextResponse.json(result, { status: 400 })
      }

      twoFactorLogger.info('SMS code verified', { userId, shopId })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    twoFactorLogger.error('Verify SMS error', error)
    return NextResponse.json({ error: 'Failed to verify SMS' }, { status: 500 })
  }
}
