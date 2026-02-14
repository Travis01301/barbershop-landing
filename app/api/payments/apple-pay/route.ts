import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { applePayService } from '@/lib/apple-pay-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const applePayLogger = logger.createChild('apple-pay-api')

const ApplePayPaymentSchema = z.object({
  appointmentId: z.string().uuid('Valid UUID required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Valid currency code required'),
  displayName: z.string().min(1, 'Display name required'),
  token: z.object({
    paymentData: z.object({
      version: z.string(),
      data: z.string(),
      signature: z.string(),
      header: z.object({
        ephemeralPublicKey: z.string(),
        publicKeyHash: z.string(),
        transactionId: z.string(),
      }),
    }),
    paymentMethod: z.object({
      displayName: z.string(),
      network: z.string(),
      type: z.string(),
    }),
  }),
})

/**
 * POST /api/payments/apple-pay
 * Process Apple Pay payment
 * No authentication required (token is from Apple, not user)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(ApplePayPaymentSchema, body, 'apple-pay')
    if (!validation.success) {
      applePayLogger.warn('Apple Pay validation failed', {
        errors: validation.errors,
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const paymentRequest = validation.data!

    applePayLogger.info('Apple Pay payment request', {
      appointmentId: paymentRequest.appointmentId,
      amount: paymentRequest.amount,
    })

    // Process payment via Stripe
    const result = await applePayService.processApplePayPayment(paymentRequest)

    applePayLogger.info('Apple Pay payment created', {
      paymentIntentId: result.paymentIntentId,
    })

    return NextResponse.json({
      success: true,
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.paymentIntentId, // Client needs this to confirm
    })
  } catch (error) {
    applePayLogger.error('Apple Pay payment processing error', error)
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/apple-pay/availability
 * Check if Apple Pay is available for this merchant
 */
export async function GET(request: NextRequest) {
  try {
    const isAvailable = await applePayService.isApplePayAvailable()

    const supportedNetworks = applePayService.getSupportedNetworks()
    const supportedCapabilities = applePayService.getSupportedCapabilities()

    return NextResponse.json({
      available: isAvailable,
      supportedNetworks,
      supportedCapabilities,
      countryCode: 'US',
      currencyCode: 'USD',
    })
  } catch (error) {
    applePayLogger.error('Apple Pay availability check error', error)
    return NextResponse.json(
      { available: false },
      { status: 500 }
    )
  }
}
