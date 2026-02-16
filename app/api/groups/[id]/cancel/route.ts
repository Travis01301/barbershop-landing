import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { groupBookingService } from '@/lib/group-booking-service'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('POST /api/groups/[id]/cancel')

/**
 * Cancel group booking
 * POST /api/groups/[id]/cancel
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
    const reason = body.reason || 'Group cancelled by organizer'

    routeLogger.info('Cancelling group booking', { groupId, reason })

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

    // Cancel group
    await groupBookingService.cancelGroupBooking(groupId, reason)

    // Fetch updated group
    const updatedGroup = await groupBookingService.getGroupBooking(groupId)

    routeLogger.info('Group cancelled successfully', { groupId })

    return NextResponse.json({
      success: true,
      groupBooking: updatedGroup,
    })
  } catch (error) {
    routeLogger.error('Error cancelling group', error)
    return NextResponse.json(
      { error: 'Failed to cancel group' },
      { status: 500 }
    )
  }
}
