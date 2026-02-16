import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, CoverageQuerySchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.coverage')

/**
 * GET - Get shift coverage statistics
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
    const includeDetails = searchParams.get('includeDetails') === 'true'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      )
    }

    const validation = validateInput(
      CoverageQuerySchema,
      { startDate, endDate, includeDetails },
      'coverage.query'
    )
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    routeLogger.debug('Fetching shift coverage', {
      shopId: decoded.shopId,
      startDate,
      endDate,
    })

    const coverage = await shiftService.getShiftCoverage(decoded.shopId, startDate, endDate)

    // Calculate statistics
    const stats = {
      totalShifts: coverage.length,
      coveredShifts: coverage.filter((c) => c.status === 'covered').length,
      understaffedShifts: coverage.filter((c) => c.status === 'understaffed').length,
      overstaffedShifts: coverage.filter((c) => c.status === 'overstaffed').length,
      coveragePercentage: coverage.length > 0
        ? Math.round(
            (coverage.filter((c) => c.status === 'covered').length / coverage.length) * 100
          )
        : 0,
      avgBarbersPerShift: coverage.length > 0
        ? (coverage.reduce((sum, c) => sum + c.assignedBarbers, 0) / coverage.length).toFixed(2)
        : 0,
    }

    return NextResponse.json({
      success: true,
      coverage: includeDetails ? coverage : coverage.map((c) => ({
        shiftDate: c.shiftDate,
        startTime: c.startTime,
        endTime: c.endTime,
        assignedBarbers: c.assignedBarbers,
        minimumRequired: c.minimumRequired,
        status: c.status,
      })),
      stats,
    })
  } catch (error) {
    routeLogger.error('Error fetching shift coverage:', error)
    return NextResponse.json({ error: 'Failed to fetch shift coverage' }, { status: 500 })
  }
}
