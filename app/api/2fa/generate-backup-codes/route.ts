import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { jwtAuth } from '@/lib/jwt-auth'
import { twoFactorService } from '@/lib/two-factor-service'

const twoFactorLogger = logger.createChild('2fa-backup-codes')

/**
 * POST /api/2fa/generate-backup-codes
 * Generate 10 new backup codes
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

    // First, delete old backup codes
    const { query } = await import('@/lib/db')
    await query(
      `DELETE FROM user_backup_codes WHERE user_id = $1 AND shop_id = $2`,
      [userId, shopId]
    )

    // Generate new backup codes
    const result = await twoFactorService.generateBackupCodes(userId, shopId)

    // Log audit event
    await twoFactorService.log2FAEvent(userId, shopId, 'backup_codes_generated', true, {
      count: result.codes.length,
    })

    twoFactorLogger.info('Backup codes generated', { userId, shopId })

    return NextResponse.json({
      success: true,
      codes: result.codes,
      count: result.codes.length,
    })
  } catch (error) {
    twoFactorLogger.error('Generate backup codes error', error)
    return NextResponse.json({ error: 'Failed to generate backup codes' }, { status: 500 })
  }
}
