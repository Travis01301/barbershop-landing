import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, AssignBarberToShiftSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.assign')

/**
 * POST - Assign a barber to a shift
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const body = await request.json()

    const validation = validateInput(AssignBarberToShiftSchema, body, 'shift.assign')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { barberId, shiftTemplateId, shiftDate, startTime, endTime, notes } = validation.data!

    // Validate times
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 })
    }

    routeLogger.debug('Assigning barber to shift', {
      shopId: decoded.shopId,
      barberId,
      shiftDate,
      startTime,
      endTime,
    })

    const shift = await shiftService.assignBarberToShift(
      decoded.shopId,
      barberId,
      shiftDate,
      startTime,
      endTime,
      {
        shiftTemplateId,
        notes,
        assignedBy: decoded.userId,
      }
    )

    routeLogger.info('Barber assigned to shift', { shiftId: shift.id, barberId })

    return NextResponse.json({
      success: true,
      shift,
    }, { status: 201 })
  } catch (error: any) {
    if (error.message.includes('conflict') || error.message.includes('time-off')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    routeLogger.error('Error assigning barber to shift:', error)
    return NextResponse.json({ error: 'Failed to assign barber to shift' }, { status: 500 })
  }
}
