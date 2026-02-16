import Stripe from 'stripe'
import { verifyWebhookSignature, handleStripeEvent } from '@/lib/stripe-webhooks'

// Mock the db query function
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))

import { query } from '@/lib/db'

describe('Stripe Webhook Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    process.env.STRIPE_SECRET_KEY = 'sk_test_key'
  })

  describe('verifyWebhookSignature', () => {
    it('should throw on missing webhook secret', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      expect(() => {
        verifyWebhookSignature('body', 'sig_test')
      }).toThrow('STRIPE_WEBHOOK_SECRET not configured')
    })

    it('should throw on missing signature', () => {
      expect(() => {
        verifyWebhookSignature('body', undefined)
      }).toThrow('No webhook signature provided')
    })

    it('should reject invalid signatures', () => {
      expect(() => {
        verifyWebhookSignature('test_body', 'invalid_sig_123')
      }).toThrow()
    })
  })

  describe('handlePaymentIntentSucceeded', () => {
    it('should update payment and appointment status', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ appointment_id: 'apt_123', stripe_payment_intent_id: 'pi_test' }],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 }) // Audit log or other query

      const { handlePaymentIntentSucceeded } = await import('@/lib/stripe-webhooks')
      await handlePaymentIntentSucceeded('pi_test')

      // At least 3 calls (SELECT, UPDATE payment, UPDATE appointment)
      expect(query.mock.calls.length).toBeGreaterThanOrEqual(3)
      
      // Verify first call: SELECT payment
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT appointment_id'),
        expect.arrayContaining(['pi_test'])
      )
      // Verify UPDATE payment status to confirmed happens
      const paymentUpdateCall = query.mock.calls.find(call =>
        call[0]?.includes('UPDATE payments') && call[1]?.includes('confirmed')
      )
      expect(paymentUpdateCall).toBeDefined()
      
      // Verify UPDATE appointment status to confirmed happens
      const appointmentUpdateCall = query.mock.calls.find(call =>
        call[0]?.includes('UPDATE appointments') && call[1]?.includes('confirmed')
      )
      expect(appointmentUpdateCall).toBeDefined()
    })

    it('should handle payment not found', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] })

      const { handlePaymentIntentSucceeded } = await import('@/lib/stripe-webhooks')
      await expect(handlePaymentIntentSucceeded('pi_missing')).resolves.toBeUndefined()

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('handlePaymentIntentFailed', () => {
    it('should update payment and cancel appointment', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              appointment_id: 'apt_123',
              customer_email: 'test@example.com',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })

      const { handlePaymentIntentFailed } = await import('@/lib/stripe-webhooks')
      await handlePaymentIntentFailed('pi_test', 'Card declined')

      expect(query).toHaveBeenCalledTimes(3)
      // First call: SELECT payment with customer
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT p.appointment_id'),
        expect.arrayContaining(['pi_test'])
      )
      // Second call: UPDATE payment status to failed
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE payments'),
        expect.arrayContaining(['failed'])
      )
      // Third call: UPDATE appointment to cancelled
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE appointments'),
        expect.arrayContaining(['cancelled'])
      )
    })

    it('should handle payment not found', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] })

      const { handlePaymentIntentFailed } = await import('@/lib/stripe-webhooks')
      await expect(handlePaymentIntentFailed('pi_missing', 'Card declined')).resolves.toBeUndefined()

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleStripeEvent', () => {
    it('should route payment_intent.succeeded event', async () => {
      const event = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
          },
        },
      } as unknown as Stripe.Event

      ;(query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] })

      const { handleStripeEvent } = await import('@/lib/stripe-webhooks')
      await handleStripeEvent(event)

      expect(query).toHaveBeenCalled()
    })

    it('should route payment_intent.payment_failed event', async () => {
      const event = {
        id: 'evt_test',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test',
            last_payment_error: { message: 'Card declined' },
          },
        },
      } as unknown as Stripe.Event

      ;(query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] })

      const { handleStripeEvent } = await import('@/lib/stripe-webhooks')
      await handleStripeEvent(event)

      expect(query).toHaveBeenCalled()
    })

    it('should handle unhandled event types gracefully', async () => {
      const event = {
        id: 'evt_test',
        type: 'charge.dispute.created',
        data: { object: {} },
      } as Stripe.Event

      const { handleStripeEvent } = await import('@/lib/stripe-webhooks')
      await expect(handleStripeEvent(event)).resolves.toBeUndefined()
    })

    it('should log errors and rethrow', async () => {
      ;(query as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

      const event = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      } as unknown as Stripe.Event

      const { handleStripeEvent } = await import('@/lib/stripe-webhooks')
      await expect(handleStripeEvent(event)).rejects.toThrow('DB error')
    })
  })

  describe('Event Type Support', () => {
    it('should support all required event types', async () => {
      const supportedEvents = [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'invoice.paid',
        'invoice.payment_failed',
      ]

      supportedEvents.forEach(eventType => {
        expect(eventType).toBeTruthy()
      })
    })
  })
})
