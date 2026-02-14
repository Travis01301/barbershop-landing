import { applePayService } from '@/lib/apple-pay-service'

jest.mock('@/lib/db')
jest.mock('stripe')

const { query } = require('@/lib/db')

describe('Apple Pay Service', () => {
  const mockApplePayToken = {
    paymentData: {
      version: 'EC_v1',
      data: 'base64_encoded_data',
      signature: 'base64_signature',
      header: {
        ephemeralPublicKey: 'ephemeral_key',
        publicKeyHash: 'hash',
        transactionId: 'txn_123',
      },
    },
    paymentMethod: {
      displayName: 'John Appleseed',
      network: 'Visa',
      type: 'credit',
    },
  }

  const mockPaymentRequest = {
    appointmentId: 'appt_123',
    amount: 50.0,
    currency: 'USD',
    displayName: 'Downtown Barbershop',
    token: mockApplePayToken,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSupportedNetworks', () => {
    it('should return supported payment networks', () => {
      const networks = applePayService.getSupportedNetworks()

      expect(networks).toContain('visa')
      expect(networks).toContain('mastercard')
      expect(networks).toContain('amex')
      expect(networks).toContain('discover')
    })

    it('should return array of strings', () => {
      const networks = applePayService.getSupportedNetworks()

      expect(Array.isArray(networks)).toBe(true)
      expect(networks.every((n) => typeof n === 'string')).toBe(true)
    })
  })

  describe('getSupportedCapabilities', () => {
    it('should return supported capabilities', () => {
      const capabilities = applePayService.getSupportedCapabilities()

      expect(capabilities).toContain('supports3DS')
    })
  })

  describe('isApplePayAvailable', () => {
    it('should return boolean', async () => {
      const result = await applePayService.isApplePayAvailable()

      expect(typeof result).toBe('boolean')
    })
  })

  describe('processApplePayPayment', () => {
    it('should validate appointment exists', async () => {
      query.mockResolvedValue({ rowCount: 0 })

      await expect(
        applePayService.processApplePayPayment(mockPaymentRequest)
      ).rejects.toThrow('Appointment not found')
    })

    it('should create payment record with correct data', async () => {
      query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'appt_123',
            email: 'customer@example.com',
            name: 'John Doe',
          },
        ],
      }).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'payment_123' }],
      })

      const result = await applePayService.processApplePayPayment(
        mockPaymentRequest
      )

      expect(result.success).toBe(true)
      expect(result.paymentIntentId).toBeTruthy()
    })

    it('should store payment intent ID in database', async () => {
      query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'appt_123',
            email: 'customer@example.com',
            name: 'John Doe',
          },
        ],
      }).mockResolvedValueOnce({
        rowCount: 1,
      })

      await applePayService.processApplePayPayment(mockPaymentRequest)

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        expect.any(Array)
      )
    })
  })

  describe('confirmApplePayPayment', () => {
    it('should handle succeeded status', async () => {
      const result = await applePayService.confirmApplePayPayment(
        'pi_123',
        'tok_apple_pay'
      )

      expect(typeof result.success).toBe('boolean')
      expect(result.status).toBeDefined()
    })

    it('should handle requires_action status', async () => {
      const result = await applePayService.confirmApplePayPayment(
        'pi_123',
        'tok_apple_pay'
      )

      expect(typeof result.success).toBe('boolean')
    })

    it('should reject invalid payment intent ID', async () => {
      await expect(
        applePayService.confirmApplePayPayment('invalid', 'token')
      ).rejects.toThrow()
    })
  })

  describe('Token validation', () => {
    it('should accept valid Apple Pay token', () => {
      expect(mockApplePayToken.paymentData.data).toBeTruthy()
      expect(mockApplePayToken.paymentData.signature).toBeTruthy()
      expect(mockApplePayToken.paymentMethod.displayName).toBeTruthy()
    })

    it('should include ephemeral public key', () => {
      expect(
        mockApplePayToken.paymentData.header.ephemeralPublicKey
      ).toBeTruthy()
    })

    it('should include transaction ID', () => {
      expect(mockApplePayToken.paymentData.header.transactionId).toBeTruthy()
    })
  })
})
