import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { validateInput, PaymentIntentSchema } from '@/lib/validation'
import { withRetry } from '@/lib/retry'

const paymentLogger = logger.createChild('PaymentIntent')

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(apiKey)
}

/**
 * Create a payment intent for booking deposit/full payment
 * POST /api/payments/intent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(PaymentIntentSchema, body, 'payment-intent')
    if (!validation.success) {
      paymentLogger.warn('Payment intent validation failed', {
        errors: validation.errors,
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { appointmentId, amount, email, description } = validation.data!

    paymentLogger.info('Payment intent request received', {
      appointmentId,
      amount,
      email,
    })

    const stripe = getStripe()

    // Create payment intent with retry logic for rate limits
    paymentLogger.debug('Creating Stripe payment intent', {
      appointmentId,
      amountInCents: Math.round(amount * 100),
    })

    const paymentIntent = await withRetry(
      async () =>
        stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          payment_method_types: ['card'],
          description:
            description ||
            `Barbershop booking deposit - Appointment #${appointmentId}`,
          receipt_email: email,
          metadata: {
            appointmentId: appointmentId.toString(),
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
          appointmentId,
          paymentIntent.id,
          Math.round(amount * 100),
          'pending',
          email,
          description || `Deposit for appointment #${appointmentId}`,
        ]
      )
    } catch (dbErr) {
      paymentLogger.error('Database error storing payment record', dbErr)
      // Continue - payment intent created successfully, just log the db issue
    }

    paymentLogger.info('Payment intent created successfully', {
      paymentIntentId: paymentIntent.id,
      appointmentId,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    paymentLogger.error('Payment intent creation error', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
