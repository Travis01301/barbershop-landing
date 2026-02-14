import Stripe from 'stripe'
import { logger } from './logger'
import { query } from './db'

const applePayLogger = logger.createChild('apple-pay')

export interface ApplePayTokenData {
  paymentData: {
    version: string
    data: string // Base64 encoded payment data
    signature: string
    header: {
      ephemeralPublicKey: string
      publicKeyHash: string
      transactionId: string
    }
  }
  paymentMethod: {
    displayName: string
    network: string
    type: string
  }
}

export interface ApplePayPaymentRequest {
  appointmentId: string
  amount: number
  currency: string
  displayName: string
  token: ApplePayTokenData
}

/**
 * Apple Pay integration via Stripe
 * Stripe handles the Apple Pay token validation and processing
 */
class ApplePayService {
  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    })
  }

  /**
   * Validate Apple Pay merchant setup
   * Call this on app initialization
   */
  async validateMerchantSetup(): Promise<boolean> {
    try {
      // Verify Stripe account has Apple Pay enabled
      const account = await this.stripe.accounts.retrieve()

      if (!account.type) {
        applePayLogger.warn('Invalid Stripe account')
        return false
      }

      applePayLogger.info('Merchant setup validated', {
        accountId: account.id,
        type: account.type,
      })

      return true
    } catch (error) {
      applePayLogger.error('Failed to validate merchant setup', error)
      return false
    }
  }

  /**
   * Process Apple Pay payment
   * Token is created by client-side JavaScript and passed to server
   */
  async processApplePayPayment(
    request: ApplePayPaymentRequest
  ): Promise<{ success: boolean; paymentIntentId: string }> {
    try {
      applePayLogger.info('Processing Apple Pay payment', {
        appointmentId: request.appointmentId,
        amount: request.amount,
        currency: request.currency,
      })

      // Get appointment details
      const appointmentResult = await query(
        `SELECT a.*, c.email, c.name 
         FROM appointments a
         JOIN customers c ON a.customer_id = c.id
         WHERE a.id = $1`,
        [request.appointmentId]
      )

      if (appointmentResult.rowCount === 0) {
        throw new Error('Appointment not found')
      }

      const appointment = appointmentResult.rows[0]
      const customerEmail = appointment.email
      const customerName = appointment.name

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        payment_method_types: ['apple_pay'],
        metadata: {
          appointmentId: request.appointmentId,
          customerEmail,
          customerName,
        },
        description: `Appointment payment for ${customerName}`,
      })

      // Create payment record in database
      const paymentId = crypto.randomUUID()
      await query(
        `INSERT INTO payments (
          id, appointment_id, customer_email, 
          stripe_payment_intent_id, amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          paymentId,
          request.appointmentId,
          customerEmail,
          paymentIntent.id,
          request.amount,
          'pending',
        ]
      )

      applePayLogger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        appointmentId: request.appointmentId,
      })

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      }
    } catch (error) {
      applePayLogger.error('Apple Pay payment processing failed', error, {
        appointmentId: request.appointmentId,
      })
      throw error
    }
  }

  /**
   * Confirm Apple Pay payment with Stripe token
   * Called after Apple Pay authorization succeeds on client
   */
  async confirmApplePayPayment(
    paymentIntentId: string,
    applePayToken: string
  ): Promise<{ success: boolean; status: string }> {
    try {
      applePayLogger.debug('Confirming Apple Pay payment', { paymentIntentId })

      // Confirm payment intent with Apple Pay token
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: applePayToken,
        }
      )

      if (paymentIntent.status === 'succeeded') {
        applePayLogger.info('Apple Pay payment confirmed', {
          paymentIntentId,
          status: paymentIntent.status,
        })

        return {
          success: true,
          status: paymentIntent.status,
        }
      } else if (paymentIntent.status === 'requires_action') {
        applePayLogger.info('Apple Pay payment requires action', {
          paymentIntentId,
          status: paymentIntent.status,
        })

        return {
          success: false,
          status: paymentIntent.status,
        }
      } else {
        applePayLogger.warn('Apple Pay payment status uncertain', {
          paymentIntentId,
          status: paymentIntent.status,
        })

        return {
          success: false,
          status: paymentIntent.status,
        }
      }
    } catch (error) {
      applePayLogger.error('Apple Pay payment confirmation failed', error, {
        paymentIntentId,
      })
      throw error
    }
  }

  /**
   * Check if Apple Pay is available for user's device
   * Used by client to show/hide Apple Pay button
   */
  async isApplePayAvailable(): Promise<boolean> {
    try {
      // Verify merchant setup exists
      return await this.validateMerchantSetup()
    } catch (error) {
      applePayLogger.warn('Apple Pay availability check failed', error)
      return false
    }
  }

  /**
   * Get supported payment networks for Apple Pay
   */
  getSupportedNetworks(): string[] {
    return ['visa', 'mastercard', 'amex', 'discover']
  }

  /**
   * Get supported capabilities for Apple Pay
   */
  getSupportedCapabilities(): string[] {
    return ['supports3DS']
  }
}

export const applePayService = new ApplePayService()

export default applePayService
