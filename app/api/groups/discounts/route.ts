import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateInput } from '@/lib/validation'
import { groupBookingService } from '@/lib/group-booking-service'
import { SetGroupDiscountSchema } from '@/lib/group-booking-validation'
import { verifyJWT } from '@/lib/jwt-auth'

const routeLogger = logger.createChild('/api/groups/discounts')

/**
 * Get discount rules for shop
 * GET /api/groups/discounts?shopId={shopId}
 */
export async function GET(request: NextRequest) {
  try {
    const shopId = request.nextUrl.searchParams.get('shopId')

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      )
    }

    routeLogger.info('Fetching discount rules', { shopId })

    const discounts = await groupBookingService.getDiscountRules(shopId)

    return NextResponse.json({
      success: true,
      discounts,
    })
  } catch (error) {
    routeLogger.error('Error fetching discount rules', error)
    return NextResponse.json(
      { error: 'Failed to fetch discount rules' },
      { status: 500 }
    )
  }
}

/**
 * Set discount rule for shop
 * POST /api/groups/discounts
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = await verifyJWT(token)
    if (!decoded || !decoded.shopId) {
      return NextResponse.json(
        { error: 'Unauthorized - shop admin required' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = validateInput(SetGroupDiscountSchema, body, 'set-group-discount')
    if (!validation.success) {
      routeLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { shopId, minGroupSize, discountPercent, description } = validation.data!

    // Verify user owns the shop
    if (decoded.shopId !== shopId) {
      return NextResponse.json(
        { error: 'Unauthorized - cannot modify other shops' },
        { status: 403 }
      )
    }

    routeLogger.info('Setting discount rule', {
      shopId,
      minGroupSize,
      discountPercent,
    })

    const discount = await groupBookingService.setDiscountRule(
      shopId,
      minGroupSize,
      discountPercent,
      description
    )

    routeLogger.info('Discount rule set successfully', { shopId, minGroupSize })

    return NextResponse.json({
      success: true,
      discount,
    })
  } catch (error) {
    routeLogger.error('Error setting discount rule', error)
    return NextResponse.json(
      { error: 'Failed to set discount rule' },
      { status: 500 }
    )
  }
}
