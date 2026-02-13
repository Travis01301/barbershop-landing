import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  verifyWebhookSignature,
  handleStripeEvent,
} from '@/lib/stripe-webhooks'

const webhookLogger = logger.createChild('stripe-webhook-endpoint')

/**
 * POST /api/webhooks/stripe
 * Receive Stripe webhook events
 * 
 * Required env vars:
 * - STRIPE_WEBHOOK_SECRET: From Stripe dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    webhookLogger.debug('Stripe webhook received', {
      signature: signature ? '✓' : '✗',
      bodyLength: body.length,
    })

    // Verify webhook signature (prevent spoofing)
    let event
    try {
      event = verifyWebhookSignature(body, signature || undefined)
    } catch (error) {
      webhookLogger.error('Webhook signature verification failed', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    webhookLogger.info('Webhook signature verified', {
      eventType: event.type,
      eventId: event.id,
    })

    // Process the event
    try {
      await handleStripeEvent(event)
    } catch (error) {
      webhookLogger.error('Error handling webhook event', error, {
        eventType: event.type,
        eventId: event.id,
      })
      // Return 500 so Stripe retries
      return NextResponse.json(
        { error: 'Failed to process event' },
        { status: 500 }
      )
    }

    // Success - return 200 so Stripe doesn't retry
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    webhookLogger.error('Unexpected error in webhook handler', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/stripe
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Stripe webhook endpoint is ready to receive events',
  })
}
