import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const twoFactorLogger = logger.createChild('2fa-backup-code-verify')

const VerifyBackupCodeSchema = z.object({
  code: z.string().min(8, 'Invalid backup code'),
})

/**
 * POST /api/2fa/verify-backup-code
 * Verify backup code during login (alternative to 2FA code)
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
    const validation = validateInput(VerifyBackupCodeSchema, body, '2fa-backup-code-verify')
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { code } = validation.data!

    // Verify backup code
    const result = await twoFactorService.verifyBackupCode(userId, shopId, code)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, 'backup_code_used', result.success)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    twoFactorLogger.info('Backup code verified', { userId, shopId })

    return NextResponse.json(result)
  } catch (error) {
    twoFactorLogger.error('Verify backup code error', error)
    return NextResponse.json({ error: 'Failed to verify backup code' }, { status: 500 })
  }
}
