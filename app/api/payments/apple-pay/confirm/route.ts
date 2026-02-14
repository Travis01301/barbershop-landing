import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { applePayService } from '@/lib/apple-pay-service'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const applePayLogger = logger.createChild('apple-pay-confirm')

const ApplePayConfirmSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID required'),
  applePayToken: z.string().min(1, 'Apple Pay token required'),
})

/**
 * POST /api/payments/apple-pay/confirm
 * Confirm Apple Pay payment after successful authorization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(ApplePayConfirmSchema, body, 'confirm')
    if (!validation.success) {
      applePayLogger.warn('Confirmation validation failed', {
        errors: validation.errors,
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { paymentIntentId, applePayToken } = validation.data!

    applePayLogger.info('Confirming Apple Pay payment', { paymentIntentId })

    // Confirm payment with Stripe
    const result = await applePayService.confirmApplePayPayment(
      paymentIntentId,
      applePayToken
    )

    if (result.success) {
      applePayLogger.info('Apple Pay payment confirmed', {
        paymentIntentId,
        status: result.status,
      })

      return NextResponse.json({
        success: true,
        status: result.status,
        message: 'Payment confirmed successfully',
      })
    } else {
      applePayLogger.warn('Apple Pay payment confirmation incomplete', {
        paymentIntentId,
        status: result.status,
      })

      return NextResponse.json({
        success: false,
        status: result.status,
        message: 'Payment requires additional action',
      })
    }
  } catch (error) {
    applePayLogger.error('Apple Pay confirmation error', error)
    return NextResponse.json(
      { error: 'Confirmation failed' },
      { status: 500 }
    )
  }
}
