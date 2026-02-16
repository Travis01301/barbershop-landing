import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { groupBookingService } from '@/lib/group-booking-service'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('POST /api/groups/[id]/confirm')

/**
 * Confirm group booking (create appointments for all members)
 * POST /api/groups/[id]/confirm
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const body = await request.json()
    const memberIds = body.memberIds // optional - confirm specific members

    routeLogger.info('Confirming group booking', { groupId, memberIds })

    // Verify group exists and organizer owns it
    const group = await groupBookingService.getGroupBooking(groupId)
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    if (group.organizerCustomerId !== decoded.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized - not group organizer' },
        { status: 403 }
      )
    }

    // Confirm group members
    await groupBookingService.confirmGroupMembers(groupId, memberIds)

    // Fetch updated group
    const updatedGroup = await groupBookingService.getGroupBooking(groupId)

    routeLogger.info('Group confirmed successfully', { groupId })

    return NextResponse.json({
      success: true,
      groupBooking: updatedGroup,
    })
  } catch (error) {
    routeLogger.error('Error confirming group', error)
    return NextResponse.json(
      { error: 'Failed to confirm group' },
      { status: 500 }
    )
  }
}
