import { NextRequest, NextResponse } from 'next/server'
import { cancellationService } from '@/lib/cancellation-service'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const cancellationsLogger = logger.createChild('api.appointments.cancellations')

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

// Query parameters schema
const CancellationsQuerySchema = z.object({
  type: z.enum(['audit', 'stats']).default('audit'),
  limit: z.string().transform(v => Math.min(parseInt(v) || 100, 500)).default('100'),
  offset: z.string().transform(v => Math.max(parseInt(v) || 0, 0)).default('0'),
})

/**
 * GET /api/appointments/cancellations
 * Get cancellation audit trail or statistics for a shop
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const shopId = decoded.shopId

    // Parse and validate query parameters
    const params = Object.fromEntries(request.nextUrl.searchParams)
    const queryValidation = CancellationsQuerySchema.safeParse(params)

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      )
    }

    const { type, limit, offset } = queryValidation.data

    if (type === 'stats') {
      // Return cancellation statistics
      const stats = await cancellationService.getCancellationStats(shopId)
      return NextResponse.json({
        success: true,
        type: 'stats',
        data: stats,
      })
    }

    // Return cancellation audit trail
    const auditRecords = await cancellationService.getCancellationAudit(shopId, limit, offset)

    return NextResponse.json({
      success: true,
      type: 'audit',
      data: auditRecords,
      pagination: {
        limit,
        offset,
        count: auditRecords.length,
      },
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      cancellationsLogger.warn('Invalid token', { error: error.message })
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    cancellationsLogger.error('Error fetching cancellations', error)
    return NextResponse.json(
      { error: 'Failed to fetch cancellation data' },
      { status: 500 }
    )
  }
}
