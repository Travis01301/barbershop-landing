import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

const paymentLogger = logger.createChild('PaymentIntent')

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(apiKey)
}

// Create a payment intent for booking deposit/full payment
export async function POST(request: NextRequest) {
  try {
    const { appointmentId, amount, email, description, shopSlug } = await request.json()

    paymentLogger.info('Payment intent request received', {
      appointmentId,
      amount,
      email,
      shopSlug,
    })

    if (!appointmentId || !amount || !email) {
      paymentLogger.warn('Missing required fields in payment intent request', {
        appointmentId: !!appointmentId,
        amount: !!amount,
        email: !!email,
      })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get shop info
    const shopResult = await pool.query(
      'SELECT id FROM shops WHERE slug = $1',
      [shopSlug]
    )

    if (shopResult.rows.length === 0) {
      paymentLogger.warn('Shop not found', { shopSlug })
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shopId = shopResult.rows[0].id

    const stripe = getStripe()
    
    // Create payment intent
    paymentLogger.debug('Creating Stripe payment intent', {
      appointmentId,
      amountInCents: Math.round(amount * 100),
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
      description: description || `Barbershop booking deposit - Appointment #${appointmentId}`,
      receipt_email: email,
      metadata: {
        appointmentId: appointmentId.toString(),
        shopId: shopId.toString(),
      },
    })

    // Store payment record in database
    await pool.query(
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
    paymentLogger.error('Payment intent creation error', error, {
      appointmentId: (error as any)?.metadata?.appointmentId,
    })
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
