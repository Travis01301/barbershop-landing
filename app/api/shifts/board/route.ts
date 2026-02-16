import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, ShiftBoardQuerySchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.board')

/**
 * GET - Fetch shift board (calendar view of all shifts)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      )
    }

    const validation = validateInput(
      ShiftBoardQuerySchema,
      { startDate, endDate },
      'shift-board.query'
    )
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    routeLogger.debug('Fetching shift board', {
      shopId: decoded.shopId,
      startDate,
      endDate,
    })

    const shifts = await shiftService.getShiftBoard(decoded.shopId, startDate, endDate)

    // Group shifts by date for easier frontend consumption
    const shiftsByDate: { [key: string]: any[] } = {}
    shifts.forEach((shift: any) => {
      if (!shiftsByDate[shift.shift_date]) {
        shiftsByDate[shift.shift_date] = []
      }
      shiftsByDate[shift.shift_date].push(shift)
    })

    return NextResponse.json({
      success: true,
      shifts,
      shiftsByDate,
      totalShifts: shifts.length,
    })
  } catch (error) {
    routeLogger.error('Error fetching shift board:', error)
    return NextResponse.json({ error: 'Failed to fetch shift board' }, { status: 500 })
  }
}
