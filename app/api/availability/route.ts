import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, SetBarberAvailabilitySchema, parseQueryParam } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.availability')

/**
 * GET - Get barber availability
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const { searchParams } = new URL(request.url)
    const barberId = parseQueryParam(searchParams.get('barberId'))

    if (!barberId) {
      return NextResponse.json({ error: 'barberId query parameter is required' }, { status: 400 })
    }

    const barberIdNum = parseInt(barberId)
    if (isNaN(barberIdNum)) {
      return NextResponse.json({ error: 'Invalid barberId' }, { status: 400 })
    }

    routeLogger.debug('Fetching barber availability', {
      shopId: decoded.shopId,
      barberId: barberIdNum,
    })

    const availability = await shiftService.getBarberAvailability(decoded.shopId, barberIdNum)

    return NextResponse.json({
      success: true,
      availability,
      count: availability.length,
    })
  } catch (error) {
    routeLogger.error('Error fetching barber availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

/**
 * POST - Set barber availability for a day
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    const validation = validateInput(SetBarberAvailabilitySchema, body, 'availability.set')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { barberId, dayOfWeek, isAvailable, availabilityType, startTime, endTime, preferenceLevel } = validation.data!

    routeLogger.debug('Setting barber availability', {
      shopId: decoded.shopId,
      barberId,
      dayOfWeek,
      isAvailable,
    })

    const availability = await shiftService.setBarberAvailability(
      decoded.shopId,
      barberId,
      dayOfWeek,
      isAvailable,
      {
        availabilityType,
        startTime,
        endTime,
        preferenceLevel,
      }
    )

    routeLogger.info('Barber availability updated', { barberId, dayOfWeek })

    return NextResponse.json({
      success: true,
      availability,
    }, { status: 201 })
  } catch (error) {
    routeLogger.error('Error setting barber availability:', error)
    return NextResponse.json({ error: 'Failed to set availability' }, { status: 500 })
  }
}
