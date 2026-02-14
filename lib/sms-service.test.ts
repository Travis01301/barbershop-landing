import SMSService from './sms-service'
import { query } from './db'

// Mock dependencies
jest.mock('./db')
jest.mock('./logger', () => ({
  logger: {
    createChild: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}))

// Mock fetch
global.fetch = jest.fn()

const mockQuery = query as jest.MockedFunction<typeof query>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('SMSService', () => {
  let service: SMSService

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.TWILIO_ACCOUNT_SID = 'AC1234567890'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_PHONE_NUMBER = '+1234567890'
    service = new SMSService()
  })

  describe('SMS Message Building', () => {
    it('should build booking SMS correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const data = {
        customerName: 'John Doe',
        customerPhone: '+15551234567',
        barberName: 'Mike',
        appointmentDate: 'Feb 14, 2026',
        appointmentTime: '2:00 PM',
        serviceName: 'Haircut',
        shopName: 'Elite Barbershop',
      }

      await service.sendBookingConfirmation(data)

      expect(mockFetch).toHaveBeenCalled()
      const call = mockFetch.mock.calls[0]
      const bodyText = (call[1] as any).body
      const params = new URLSearchParams(bodyText)

      const message = params.get('Body')
      expect(message).toContain('John Doe')
      expect(message).toContain('Elite Barbershop')
      expect(message).toContain('Mike')
    })

    it('should build 24h reminder SMS', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const data = {
        customerName: 'Jane Smith',
        customerPhone: '+15559876543',
        barberName: 'Sarah',
        appointmentTime: '10:00 AM',
        shopName: 'Premium Cuts',
        shopPhone: '+15551112222',
      }

      await service.send24hReminder(data)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should build cancellation SMS with fee', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const data = {
        customerName: 'Alice Williams',
        customerPhone: '+15556667777',
        barberName: 'Dave',
        appointmentTime: 'Feb 15, 2:00 PM',
        cancellationFee: 20,
        shopName: 'Classic Barbershop',
      }

      await service.sendCancellationNotice(data)

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Phone Number Validation', () => {
    it('should reject invalid phone numbers', async () => {
      const invalidNumbers = ['123', '555', 'not-a-phone', '']

      for (const phoneNumber of invalidNumbers) {
        const result = await service.send({
          phoneNumber,
          message: 'Test message',
        })

        expect(result.success).toBe(false)
      }
    })

    it('should accept valid US phone numbers', async () => {
      const validNumbers = [
        '+15551234567',
        '15551234567',
        '+1 (555) 123-4567',
      ]

      for (const phoneNumber of validNumbers) {
        mockFetch.mockClear()
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
        } as any)

        const result = await service.send({
          phoneNumber,
          message: 'Test message',
        })

        // Should attempt to call Twilio for valid numbers
        expect(mockFetch).toHaveBeenCalled()
      }
    })
  })

  describe('Twilio API Integration', () => {
    it('should call Twilio API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      await service.send({
        phoneNumber: '+15551234567',
        message: 'Test message',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('AC1234567890'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      )
    })

    it('should handle Twilio API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Invalid phone' }),
      } as any)

      const result = await service.send({
        phoneNumber: '+15551234567',
        message: 'Test message',
      })

      expect(result.success).toBe(false)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.send({
        phoneNumber: '+15551234567',
        message: 'Test message',
      })

      expect(result.success).toBe(false)
    })

    it('should skip sending if credentials not configured', async () => {
      const originalSid = process.env.TWILIO_ACCOUNT_SID
      const originalToken = process.env.TWILIO_AUTH_TOKEN

      process.env.TWILIO_ACCOUNT_SID = ''
      process.env.TWILIO_AUTH_TOKEN = ''

      const unconfiguredService = new SMSService()

      const result = await unconfiguredService.send({
        phoneNumber: '+15551234567',
        message: 'Test message',
      })

      expect(result.success).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()

      process.env.TWILIO_ACCOUNT_SID = originalSid
      process.env.TWILIO_AUTH_TOKEN = originalToken
    })

    it('should return Twilio message ID on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM_test123456' }),
      } as any)

      const result = await service.send({
        phoneNumber: '+15551234567',
        message: 'Test message',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('SM_test123456')
    })
  })

  describe('SMS Logging', () => {
    it('should log SMS sent to database', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await service.logSMSSent('apt-123', '+15551234567', 'booking', true, 'SM123')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sms_logs'),
        ['apt-123', '+15551234567', 'booking', true, 'SM123']
      )
    })

    it('should retrieve SMS history', async () => {
      const mockHistory = [
        {
          id: '1',
          message_type: 'booking',
          success: true,
          sent_at: '2026-02-14T10:00:00Z',
        },
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockHistory, rowCount: 1 })

      const history = await service.getSMSHistory('apt-123')

      expect(history).toEqual(mockHistory)
    })
  })

  describe('SMS Statistics', () => {
    it('should calculate SMS statistics correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_sent: '100',
            success_count: '95',
            failure_count: '5',
          },
        ],
        rowCount: 1,
      })

      const stats = await service.getSMSStats(1)

      expect(stats.totalSent).toBe(100)
      expect(stats.successCount).toBe(95)
      expect(stats.failureCount).toBe(5)
      expect(stats.successRate).toBe(95)
    })
  })

  describe('SMS Service Methods', () => {
    it('should send booking confirmation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const result = await service.sendBookingConfirmation({
        customerName: 'John',
        customerPhone: '+15551234567',
        barberName: 'Mike',
        appointmentDate: 'Feb 14',
        appointmentTime: '2:00 PM',
        shopName: 'Barbershop',
      })

      expect(result).toBe(true)
    })

    it('should send 24h reminder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const result = await service.send24hReminder({
        customerName: 'Jane',
        customerPhone: '+15551234567',
        barberName: 'Sarah',
        appointmentTime: '10:00 AM',
        shopName: 'Barbershop',
      })

      expect(result).toBe(true)
    })

    it('should send cancellation notice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ sid: 'SM123' }),
      } as any)

      const result = await service.sendCancellationNotice({
        customerName: 'Bob',
        customerPhone: '+15551234567',
        barberName: 'Tom',
        appointmentTime: 'Feb 14, 2:00 PM',
        cancellationFee: 20,
        shopName: 'Barbershop',
      })

      expect(result).toBe(true)
    })
  })
})
