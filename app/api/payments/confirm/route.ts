import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import Stripe from 'stripe'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(apiKey)
}

// Confirm payment and update appointment status
export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, appointmentId } = await request.json()

    if (!paymentIntentId || !appointmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      )
    }

    const status = paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed'

    // Update payment record in database
    const paymentResult = await pool.query(
      `UPDATE payments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $2
       RETURNING *`,
      [status, paymentIntentId]
    )

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    if (status === 'succeeded') {
      // Update appointment to mark deposit as paid
      await pool.query(
        `UPDATE appointments 
         SET deposit_paid = true, total_paid = $1 
         WHERE id = $2`,
        [paymentResult.rows[0].amount, appointmentId]
      )
    }

    return NextResponse.json({
      success: true,
      status: status,
      payment: paymentResult.rows[0],
    })
  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
