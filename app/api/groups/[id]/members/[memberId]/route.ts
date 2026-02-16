import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateInput } from '@/lib/validation'
import { groupBookingService } from '@/lib/group-booking-service'
import { AssignBarberSchema } from '@/lib/group-booking-validation'
import { verifyJWT } from '@/lib/jwt-auth'
import { query } from '@/lib/db'

const routeLogger = logger.createChild('PATCH /api/groups/[id]/members/[memberId]')

/**
 * Reassign barber/time for group member
 * PATCH /api/groups/[id]/members/[memberId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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
    const memberId = params.memberId
    const body = await request.json()

    // Validate input
    const validation = validateInput(AssignBarberSchema, body, 'assign-barber')
    if (!validation.success) {
      routeLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { barberId, slotTime } = validation.data!

    routeLogger.info('Reassigning barber to member', {
      groupId,
      memberId,
      barberId,
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

    // Reassign barber
    const member = await groupBookingService.assignBarberToMember(
      groupId,
      memberId,
      barberId,
      new Date(slotTime)
    )

    routeLogger.info('Barber reassigned successfully', {
      groupId,
      memberId,
      barberId,
    })

    return NextResponse.json({
      success: true,
      member,
    })
  } catch (error) {
    routeLogger.error('Error reassigning barber', error)
    return NextResponse.json(
      { error: 'Failed to reassign barber' },
      { status: 500 }
    )
  }
}

/**
 * Remove member from group
 * DELETE /api/groups/[id]/members/[memberId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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
    const memberId = params.memberId

    routeLogger.info('Removing member from group', { groupId, memberId })

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

    // Remove member
    await groupBookingService.removeGroupMember(groupId, memberId)

    routeLogger.info('Member removed successfully', { groupId, memberId })

    return NextResponse.json({
      success: true,
      message: 'Member removed from group',
    })
  } catch (error) {
    routeLogger.error('Error removing member', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
