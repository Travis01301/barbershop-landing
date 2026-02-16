import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateInput } from '@/lib/validation'
import { groupBookingService } from '@/lib/group-booking-service'
import { CreateGroupBookingSchema } from '@/lib/group-booking-validation'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('POST /api/groups/create')

/**
 * Create a new group booking
 * POST /api/groups/create
 * 
 * Body:
 * - shopId (UUID): The shop ID
 * - groupName (string): Name of the group
 * - groupSize (number): Expected group size (2-100)
 * - notes (optional string): Additional notes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      routeLogger.warn('Missing authorization token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded || !decoded.customerId) {
      routeLogger.warn('Invalid token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateGroupBookingSchema, body, 'create-group')
    if (!validation.success) {
      routeLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { shopId, groupName, groupSize, notes } = validation.data!

    routeLogger.info('Creating group booking', {
      shopId,
      groupName,
      groupSize,
      organizerId: decoded.customerId,
    })

    // Create group booking
    const groupBooking = await groupBookingService.createGroupBooking(
      shopId,
      decoded.customerId,
      groupName,
      groupSize,
      notes
    )

    routeLogger.info('Group booking created successfully', {
      groupBookingId: groupBooking.id,
    })

    return NextResponse.json({
      success: true,
      groupBooking,
    })
  } catch (error) {
    routeLogger.error('Error creating group booking', error)
    return NextResponse.json(
      { error: 'Failed to create group booking' },
      { status: 500 }
    )
  }
}
