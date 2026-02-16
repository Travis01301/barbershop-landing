import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateInput } from '@/lib/validation'
import { groupBookingService } from '@/lib/group-booking-service'
import { GroupPaymentSchema } from '@/lib/group-booking-validation'
import { verifyJWT } from '@/lib/jwt-auth'
import { query } from '@/lib/db'
import { withRetry } from '@/lib/retry'

const routeLogger = logger.createChild('POST /api/groups/[id]/payment')

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(apiKey)
}

/**
 * Create payment intent for group booking
 * POST /api/groups/[id]/payment
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
    const validation = validateInput(GroupPaymentSchema, body, 'group-payment')
    if (!validation.success) {
      routeLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { amount, email, paymentMethodType } = validation.data!

    routeLogger.info('Creating payment intent for group', {
      groupId,
      amount,
      email,
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

    const stripe = getStripe()

    // Create payment intent
    const paymentIntent = await withRetry(
      async () =>
        stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          payment_method_types: paymentMethodType ? [paymentMethodType] : ['card'],
          description: `Group booking payment - ${group.groupName} (${group.groupSize} people)`,
          receipt_email: email,
          metadata: {
            groupBookingId: groupId,
            organizerId: group.organizerCustomerId,
            groupName: group.groupName,
          },
        }),
      {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
      }
    )

    // Store payment record in database
    try {
      await query(
        `INSERT INTO payments (appointment_id, stripe_payment_intent_id, amount, status, customer_email, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [
          null, // No single appointment for group
          paymentIntent.id,
          Math.round(amount * 100),
          'pending',
          email,
          `Group booking payment: ${group.groupName}`,
        ]
      )

      // Create group payment record
      await query(
        `INSERT INTO group_booking_payments (group_booking_id, stripe_payment_intent_id, amount, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        [groupId, paymentIntent.id, Math.round(amount * 100)]
      )
    } catch (dbErr) {
      routeLogger.error('Database error storing payment record', dbErr)
      // Continue - payment intent created successfully
    }

    routeLogger.info('Payment intent created successfully', {
      paymentIntentId: paymentIntent.id,
      groupId,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    routeLogger.error('Error creating payment intent', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
