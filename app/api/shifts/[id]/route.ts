import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, UpdateBarberShiftSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.[id]')

/**
 * PATCH - Update a shift
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
    const shiftId = parseInt(params.id)

    if (isNaN(shiftId)) {
      return NextResponse.json({ error: 'Invalid shift ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = validateInput(UpdateBarberShiftSchema, body, 'shift.update')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    routeLogger.debug('Updating shift', { shiftId, shopId: decoded.shopId })

    const shift = await shiftService.updateBarberShift(shiftId, decoded.shopId, validation.data!)

    routeLogger.info('Shift updated', { shiftId })

    return NextResponse.json({
      success: true,
      shift,
    })
  } catch (error: any) {
    if (error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    routeLogger.error('Error updating shift:', error)
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
  }
}

/**
 * DELETE - Delete a shift (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const shiftId = parseInt(params.id)

    if (isNaN(shiftId)) {
      return NextResponse.json({ error: 'Invalid shift ID' }, { status: 400 })
    }

    routeLogger.debug('Deleting shift', { shiftId, shopId: decoded.shopId })

    await shiftService.deleteBarberShift(shiftId, decoded.shopId)

    routeLogger.info('Shift deleted', { shiftId })

    return NextResponse.json({
      success: true,
      message: 'Shift deleted',
    })
  } catch (error: any) {
    if (error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    routeLogger.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
  }
}
