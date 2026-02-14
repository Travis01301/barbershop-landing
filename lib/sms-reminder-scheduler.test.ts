import {
  scheduleRemindersSMS,
  sendBookingConfirmationSMS,
  sendCancellationSMS,
  getReminderStatus,
} from './sms-reminder-scheduler'
import { query } from './db'
import { smsService } from './sms-service'

// Mock dependencies
jest.mock('./db')
jest.mock('./sms-service')
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

const mockQuery = query as jest.MockedFunction<typeof query>
const mockSmsService = smsService as jest.Mocked<typeof smsService>

describe('SMS Reminder Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('scheduleRemindersSMS', () => {
    it('should schedule both 24h and day-of reminders for future appointments', async () => {
      const appointmentTime = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours away

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // 24h reminder insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // day-of reminder insert

      const result = await scheduleRemindersSMS('apt-123', '+15551234567', appointmentTime)

      expect(result.success).toBe(true)
      expect(result.reminders).toBe(2)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('should only schedule day-of reminder for appointments within 24 hours', async () => {
      const appointmentTime = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours away

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }) // day-of reminder insert

      const result = await scheduleRemindersSMS('apt-456', '+15559876543', appointmentTime)

      expect(result.success).toBe(true)
      expect(result.reminders).toBe(1)
    })

    it('should not schedule reminders for appointments within 1 hour', async () => {
      const appointmentTime = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes away

      const result = await scheduleRemindersSMS('apt-789', '+15555555555', appointmentTime)

      expect(result.reminders).toBe(0)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const appointmentTime = new Date(Date.now() + 48 * 60 * 60 * 1000)

      // First insert succeeds, second fails
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // 24h succeeds
        .mockRejectedValueOnce(new Error('Database error')) // day-of fails

      const result = await scheduleRemindersSMS('apt-123', '+15551234567', appointmentTime)

      // The function should insert the first reminder and skip the second
      expect(result.reminders).toBe(1)
      expect(result.success).toBe(true)
    })
  })

  describe('sendBookingConfirmationSMS', () => {
    it('should send booking confirmation SMS', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockSmsService.sendBookingConfirmation.mockResolvedValueOnce(true)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      const result = await sendBookingConfirmationSMS(
        'apt-123',
        1,
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        'Haircut',
        'Elite Barbershop'
      )

      expect(result).toBe(true)
      expect(mockSmsService.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'John Doe',
          customerPhone: '+15551234567',
          barberName: 'Mike',
          serviceName: 'Haircut',
          shopName: 'Elite Barbershop',
        })
      )
      expect(mockSmsService.logSMSSent).toHaveBeenCalledWith(
        'apt-123',
        '+15551234567',
        'booking',
        true
      )
    })

    it('should fetch shop name if not provided', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Test Barbershop' }],
        rowCount: 1,
      })
      mockSmsService.sendBookingConfirmation.mockResolvedValueOnce(true)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      await sendBookingConfirmationSMS(
        'apt-123',
        1,
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        'Haircut'
      )

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT name FROM shops'),
        [1]
      )
      expect(mockSmsService.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          shopName: 'Test Barbershop',
        })
      )
    })

    it('should log SMS as failed if sending fails', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockSmsService.sendBookingConfirmation.mockResolvedValueOnce(false)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      const result = await sendBookingConfirmationSMS(
        'apt-123',
        1,
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        'Haircut',
        'Elite Barbershop'
      )

      expect(result).toBe(false)
      expect(mockSmsService.logSMSSent).toHaveBeenCalledWith(
        'apt-123',
        '+15551234567',
        'booking',
        false
      )
    })

    it('should handle null barber name', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockSmsService.sendBookingConfirmation.mockResolvedValueOnce(true)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      await sendBookingConfirmationSMS(
        'apt-123',
        1,
        'John Doe',
        '+15551234567',
        null,
        appointmentTime,
        'Haircut',
        'Elite Barbershop'
      )

      expect(mockSmsService.sendBookingConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          barberName: 'Your barber',
        })
      )
    })
  })

  describe('sendCancellationSMS', () => {
    it('should send cancellation SMS with fee', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockSmsService.sendCancellationNotice.mockResolvedValueOnce(true)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      const result = await sendCancellationSMS(
        'apt-123',
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        20,
        'Elite Barbershop'
      )

      expect(result).toBe(true)
      expect(mockSmsService.sendCancellationNotice).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'John Doe',
          customerPhone: '+15551234567',
          cancellationFee: 20,
        })
      )
    })

    it('should fetch shop name if not provided', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Test Barbershop' }],
        rowCount: 1,
      })
      mockSmsService.sendCancellationNotice.mockResolvedValueOnce(true)
      mockSmsService.logSMSSent.mockResolvedValueOnce(undefined)

      await sendCancellationSMS(
        'apt-123',
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        20
      )

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT s.name FROM appointments'),
        ['apt-123']
      )
    })

    it('should handle errors gracefully', async () => {
      const appointmentTime = new Date('2026-02-14T14:00:00')

      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const result = await sendCancellationSMS(
        'apt-123',
        'John Doe',
        '+15551234567',
        'Mike',
        appointmentTime,
        20
      )

      expect(result).toBe(false)
    })
  })

  describe('getReminderStatus', () => {
    it('should return reminder status for appointment', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sent_count: '2',
            failed_count: '0',
            pending_count: '1',
            total_count: '3',
          },
        ],
        rowCount: 1,
      })

      const status = await getReminderStatus('apt-123')

      expect(status.scheduled).toBe(3)
      expect(status.sent).toBe(2)
      expect(status.failed).toBe(0)
      expect(status.pending).toBe(1)
    })

    it('should handle no reminders', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sent_count: '0',
            failed_count: '0',
            pending_count: '0',
            total_count: '0',
          },
        ],
        rowCount: 1,
      })

      const status = await getReminderStatus('apt-456')

      expect(status.scheduled).toBe(0)
      expect(status.sent).toBe(0)
      expect(status.failed).toBe(0)
      expect(status.pending).toBe(0)
    })

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const status = await getReminderStatus('apt-789')

      expect(status.scheduled).toBe(0)
      expect(status.sent).toBe(0)
      expect(status.failed).toBe(0)
      expect(status.pending).toBe(0)
    })
  })
})
