import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateInput } from '@/lib/validation'
import { groupBookingService } from '@/lib/group-booking-service'
import { AddGroupMemberSchema } from '@/lib/group-booking-validation'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('POST /api/groups/[id]/members')

/**
 * Add member to group booking
 * POST /api/groups/[id]/members
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

    // Validate input
    const validation = validateInput(AddGroupMemberSchema, body, 'add-group-member')
    if (!validation.success) {
      routeLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const {
      customerId,
      barberId,
      guestName,
      guestEmail,
      guestPhone,
      slotTime,
      serviceType,
      servicePrice,
    } = validation.data!

    routeLogger.info('Adding member to group', {
      groupId,
      slotTime,
      servicePrice,
    })

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

    // Add member
    const member = await groupBookingService.addGroupMember(
      groupId,
      new Date(slotTime),
      servicePrice,
      {
        customerId,
        barberId,
        guestName,
        guestEmail,
        guestPhone,
        serviceType,
      }
    )

    routeLogger.info('Member added successfully', {
      groupId,
      memberId: member.id,
    })

    return NextResponse.json({
      success: true,
      member,
    })
  } catch (error) {
    routeLogger.error('Error adding member', error)
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}
