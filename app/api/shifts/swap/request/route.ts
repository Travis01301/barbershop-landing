import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, RequestShiftSwapSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.swap.request')

/**
 * GET - Get pending swap requests for a barber
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')

    if (!barberId) {
      return NextResponse.json({ error: 'barberId query parameter is required' }, { status: 400 })
    }

    const barberIdNum = parseInt(barberId)
    if (isNaN(barberIdNum)) {
      return NextResponse.json({ error: 'Invalid barberId' }, { status: 400 })
    }

    routeLogger.debug('Fetching pending swap requests', {
      shopId: decoded.shopId,
      barberId: barberIdNum,
    })

    const swaps = await shiftService.getPendingShiftSwaps(decoded.shopId, barberIdNum)

    return NextResponse.json({
      success: true,
      swaps,
      count: swaps.length,
    })
  } catch (error) {
    routeLogger.error('Error fetching swap requests:', error)
    return NextResponse.json({ error: 'Failed to fetch swap requests' }, { status: 500 })
  }
}

/**
 * POST - Request a shift swap
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const body = await request.json()

    const validation = validateInput(RequestShiftSwapSchema, body, 'shift-swap.request')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { requestingBarberId, requestedBarberId, shiftIdToGive, shiftIdToReceive, notes } = validation.data!

    routeLogger.debug('Requesting shift swap', {
      shopId: decoded.shopId,
      requestingBarberId,
      requestedBarberId,
    })

    const swap = await shiftService.requestShiftSwap(
      decoded.shopId,
      requestingBarberId,
      requestedBarberId,
      shiftIdToGive,
      shiftIdToReceive,
      notes
    )

    routeLogger.info('Shift swap request created', { swapId: swap.id })

    return NextResponse.json({
      success: true,
      swap,
    }, { status: 201 })
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    routeLogger.error('Error creating shift swap request:', error)
    return NextResponse.json({ error: 'Failed to create shift swap request' }, { status: 500 })
  }
}
