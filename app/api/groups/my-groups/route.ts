import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { groupBookingService } from '@/lib/group-booking-service'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('GET /api/groups/my-groups')

/**
 * Get customer's group bookings
 * GET /api/groups/my-groups
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded || !decoded.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    routeLogger.info('Fetching customer groups', { customerId: decoded.customerId })

    // Get customer's groups
    const groups = await groupBookingService.getCustomerGroups(decoded.customerId)

    // Get details for each group
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const members = await groupBookingService.getGroupBookingWithMembers(group.id)
        return {
          ...group,
          memberCount: members.members.length,
          members: members.members,
        }
      })
    )

    routeLogger.info('Groups fetched successfully', {
      customerId: decoded.customerId,
      count: groups.length,
    })

    return NextResponse.json({
      success: true,
      groups: groupsWithDetails,
    })
  } catch (error) {
    routeLogger.error('Error fetching customer groups', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}
