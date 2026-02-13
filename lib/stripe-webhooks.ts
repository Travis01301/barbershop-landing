import Stripe from 'stripe'
import { logger } from './logger'
import { query } from './db'

const webhookLogger = logger.createChild('stripe-webhooks')

/**
 * Verify Stripe webhook signature to prevent spoofing
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  }

  if (!signature) {
    throw new Error('No webhook signature provided')
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    })
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    return event
  } catch (error) {
    webhookLogger.error('Webhook signature verification failed', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Handle payment_intent.succeeded event
 * Mark appointment as paid and confirmed
 */
export async function handlePaymentIntentSucceeded(
  paymentIntentId: string
): Promise<void> {
  webhookLogger.info('Processing payment_intent.succeeded', { paymentIntentId })

  try {
    // Get the payment record
    const paymentResult = await query(
      `SELECT appointment_id, stripe_payment_intent_id FROM payments 
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId]
    )

    if (paymentResult.rowCount === 0) {
      webhookLogger.warn('Payment not found in database', { paymentIntentId })
      return
    }

    const payment = paymentResult.rows[0]
    const appointmentId = payment.appointment_id

    // Update payment status to confirmed
    await query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $2`,
      ['confirmed', paymentIntentId]
    )

    // Update appointment status to paid/confirmed
    await query(
      `UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ['confirmed', appointmentId]
    )

    webhookLogger.info('Payment confirmed and appointment marked as paid', {
      paymentIntentId,
      appointmentId,
    })
  } catch (error) {
    webhookLogger.error('Error processing payment_intent.succeeded', error, {
      paymentIntentId,
    })
    throw error
  }
}

/**
 * Handle payment_intent.payment_failed event
 * Cancel appointment and notify customer
 */
export async function handlePaymentIntentFailed(
  paymentIntentId: string,
  failureReason?: string
): Promise<void> {
  webhookLogger.info('Processing payment_intent.payment_failed', {
    paymentIntentId,
    failureReason,
  })

  try {
    // Get the payment record with customer email
    const paymentResult = await query(
      `SELECT p.appointment_id, p.customer_email 
       FROM payments p
       WHERE p.stripe_payment_intent_id = $1`,
      [paymentIntentId]
    )

    if (paymentResult.rowCount === 0) {
      webhookLogger.warn('Payment not found in database', { paymentIntentId })
      return
    }

    const payment = paymentResult.rows[0]
    const appointmentId = payment.appointment_id
    const customerEmail = payment.customer_email

    // Update payment status to failed
    await query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $2`,
      ['failed', paymentIntentId]
    )

    // Cancel the appointment
    await query(
      `UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ['cancelled', appointmentId]
    )

    // TODO: Send email to customer about payment failure
    // This would call your email service (Resend)
    webhookLogger.info('Appointment cancelled due to payment failure', {
      appointmentId,
      customerEmail,
      failureReason,
    })
  } catch (error) {
    webhookLogger.error('Error processing payment_intent.payment_failed', error, {
      paymentIntentId,
    })
    throw error
  }
}

/**
 * Handle invoice.paid event (for subscription payments)
 */
export async function handleInvoicePaid(invoiceId: string): Promise<void> {
  webhookLogger.info('Processing invoice.paid', { invoiceId })
  // Implement if using subscriptions
}

/**
 * Handle invoice.payment_failed event
 */
export async function handleInvoicePaymentFailed(invoiceId: string): Promise<void> {
  webhookLogger.info('Processing invoice.payment_failed', { invoiceId })
  // Implement if using subscriptions
}

/**
 * Main webhook router
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  webhookLogger.debug('Handling Stripe event', { type: event.type, eventId: event.id })

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(paymentIntent.id)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const failureReason = paymentIntent.last_payment_error?.message
        await handlePaymentIntentFailed(paymentIntent.id, failureReason)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice.id)
        break
      }

      default:
        webhookLogger.debug('Unhandled event type', { type: event.type })
    }

    webhookLogger.info('Event processed successfully', { type: event.type, eventId: event.id })
  } catch (error) {
    webhookLogger.error('Error handling Stripe event', error, { type: event.type })
    throw error
  }
}
