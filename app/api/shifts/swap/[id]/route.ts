import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, RespondToShiftSwapSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.swap.[id]')

/**
 * PATCH - Approve or deny a shift swap request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const swapId = parseInt(params.id)

    if (isNaN(swapId)) {
      return NextResponse.json({ error: 'Invalid swap ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = validateInput(RespondToShiftSwapSchema, body, 'shift-swap.respond')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { status } = validation.data!

    routeLogger.debug('Responding to shift swap request', {
      swapId,
      shopId: decoded.shopId,
      status,
    })

    if (status === 'approved') {
      await shiftService.approveShiftSwap(swapId, decoded.shopId)
      routeLogger.info('Shift swap approved', { swapId })
      return NextResponse.json({
        success: true,
        message: 'Shift swap approved and shifts have been exchanged.',
      })
    } else {
      await shiftService.denyShiftSwap(swapId, decoded.shopId)
      routeLogger.info('Shift swap denied', { swapId })
      return NextResponse.json({
        success: true,
        message: 'Shift swap request denied.',
      })
    }
  } catch (error) {
    routeLogger.error('Error responding to shift swap:', error)
    return NextResponse.json({ error: 'Failed to respond to shift swap' }, { status: 500 })
  }
}
