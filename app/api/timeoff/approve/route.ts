import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, ApproveTimeOffSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.timeoff.approve')

/**
 * PATCH - Approve a time-off request
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({ error: 'requestId query parameter is required' }, { status: 400 })
    }

    const requestIdNum = parseInt(requestId)
    if (isNaN(requestIdNum)) {
      return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 })
    }

    const body = await request.json()
    const validation = validateInput(ApproveTimeOffSchema, body, 'timeoff.approve')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { approvedBy } = validation.data!

    routeLogger.debug('Approving time-off request', {
      shopId: decoded.shopId,
      requestId: requestIdNum,
      approvedBy,
    })

    const timeOffRequest = await shiftService.approveTimeOff(
      requestIdNum,
      decoded.shopId,
      approvedBy
    )

    routeLogger.info('Time-off request approved', { requestId: requestIdNum })

    return NextResponse.json({
      success: true,
      request: timeOffRequest,
      message: 'Time-off request approved. All shifts during this period have been cancelled.',
    })
  } catch (error: any) {
    if (error.message === 'Request not found') {
      return NextResponse.json({ error: 'Time-off request not found' }, { status: 404 })
    }
    routeLogger.error('Error approving time-off request:', error)
    return NextResponse.json({ error: 'Failed to approve time-off request' }, { status: 500 })
  }
}
