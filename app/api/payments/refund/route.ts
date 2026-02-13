import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'
import { withRetry } from '@/lib/retry'

const refundLogger = logger.createChild('refund')

const RefundSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID required'),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent'], {
    errorMap: () => ({ message: 'Invalid refund reason' }),
  }),
  amount: z.number().positive('Amount must be positive').optional(),
})

/**
 * POST /api/payments/refund
 * Process refund for a payment
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization')
    const token = jwtAuth.extractToken(authHeader)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await jwtAuth.verifyAccessToken(token)

    const body = await request.json()

    // Validate input
    const validation = validateInput(RefundSchema, body, 'refund')
    if (!validation.success) {
      refundLogger.warn('Refund validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { paymentIntentId, reason, amount } = validation.data!

    refundLogger.info('Refund request', {
      userId: user.userId,
      paymentIntentId,
      reason,
      amount,
    })

    // Get payment details
    const paymentResult = await query(
      `SELECT p.*, a.shop_id FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE p.stripe_payment_intent_id = $1`,
      [paymentIntentId]
    )

    if (paymentResult.rowCount === 0) {
      refundLogger.warn('Payment not found', { paymentIntentId })
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentResult.rows[0]

    // Check authorization (user must own the shop or be admin)
    if (user.role !== 'admin' && user.shopId !== payment.shop_id) {
      refundLogger.warn('Unauthorized refund attempt', {
        userId: user.userId,
        shopId: payment.shop_id,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    })

    // Process refund with retry
    const refund = await withRetry(
      async () =>
        stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: reason,
        }),
      { maxAttempts: 3, initialDelayMs: 100 }
    )

    // Update payment status
    await query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $2`,
      ['refunded', paymentIntentId]
    )

    refundLogger.info('Refund processed successfully', {
      paymentIntentId,
      refundId: refund.id,
      amount: refund.amount,
    })

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    })
  } catch (error) {
    refundLogger.error('Refund processing error', error)
    return NextResponse.json(
      { error: 'Refund failed' },
      { status: 500 }
    )
  }
}
