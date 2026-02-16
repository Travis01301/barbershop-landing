import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { groupBookingService } from '@/lib/group-booking-service'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('GET /api/groups/[id]')

/**
 * Get group booking details with members
 * GET /api/groups/[id]
 */
export async function GET(
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

    routeLogger.info('Fetching group details', { groupId })

    const groupData = await groupBookingService.getGroupBookingWithMembers(groupId)

    if (!groupData.booking) {
      routeLogger.warn('Group not found', { groupId })
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: groupData.booking,
      members: groupData.members,
    })
  } catch (error) {
    routeLogger.error('Error fetching group', error)
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}

/**
 * Update group booking details (name, notes)
 * PATCH /api/groups/[id]
 */
export async function PATCH(
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

    const { groupName, notes } = body

    routeLogger.info('Updating group', { groupId, groupName })

    // Get group to verify ownership
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

    // Update group (using direct query for simplicity)
    const { query } = await import('@/lib/db')
    await query(
      `UPDATE group_bookings 
       SET ${groupName ? 'group_name = $1,' : ''} ${notes !== undefined ? 'notes = $2,' : ''} updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [groupName, notes, groupId].filter((v) => v !== undefined && v !== null)
    )

    const updatedGroup = await groupBookingService.getGroupBooking(groupId)

    routeLogger.info('Group updated successfully', { groupId })

    return NextResponse.json({
      success: true,
      groupBooking: updatedGroup,
    })
  } catch (error) {
    routeLogger.error('Error updating group', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}
