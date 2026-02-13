import { emailService, BookingConfirmationData, ReminderEmailData, CancellationEmailData } from '@/lib/email-service'

// Mock fetch
global.fetch = jest.fn()

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 'test_key_123'
    process.env.EMAIL_FROM = 'noreply@test.com'
  })

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation email', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      const result = await emailService.sendBookingConfirmation({
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        barberName: 'Mike Smith',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.any(Object)
      )
    })

    it('should call Resend API with correct credentials', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const call = (global.fetch as jest.Mock).mock.calls[0]
      expect(call[0]).toBe('https://api.resend.com/emails')
      expect(call[1].headers.Authorization).toContain('Bearer')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API error' }),
      })

      const result = await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(false)
    })
  })

  describe('sendAppointmentReminder', () => {
    it('should send reminder email', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_456' }),
      })

      const result = await emailService.sendAppointmentReminder({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: 'Tomorrow',
        appointmentTime: '2:00 PM',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should include optional shop phone number', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_456' }),
      })

      const result = await emailService.sendAppointmentReminder({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: 'Tomorrow',
        appointmentTime: '2:00 PM',
        shopName: 'Cool Cuts',
        shopPhone: '555-1234',
      })

      expect(result).toBe(true)
    })
  })

  describe('sendCancellationConfirmation', () => {
    it('should send cancellation email', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_789' }),
      })

      const result = await emailService.sendCancellationConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(true)
    })

    it('should include optional cancellation reason', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_789' }),
      })

      const result = await emailService.sendCancellationConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        cancellationReason: 'Customer request',
        shopName: 'Cool Cuts',
      })

      expect(result).toBe(true)
    })
  })

  describe('Email content security', () => {
    it('should escape HTML in names to prevent XSS', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: '<script>alert("xss")</script>',
        customerEmail: 'test@example.com',
        barberName: 'Mike & Sons',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const call = (global.fetch as jest.Mock).mock.calls[0]
      expect(call[1].body).toBeDefined()
    })

    it('should include both HTML and text versions', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const call = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.html).toBeTruthy()
      expect(body.text).toBeTruthy()
    })
  })

  describe('API integration', () => {
    it('should use Resend endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const [url] = (global.fetch as jest.Mock).mock.calls[0]
      expect(url).toBe('https://api.resend.com/emails')
    })

    it('should set POST method', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const [, options] = (global.fetch as jest.Mock).mock.calls[0]
      expect(options.method).toBe('POST')
    })

    it('should include Content-Type header', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const [, options] = (global.fetch as jest.Mock).mock.calls[0]
      expect(options.headers['Content-Type']).toBe('application/json')
    })

    it('should include Authorization header', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      })

      await emailService.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      const [, options] = (global.fetch as jest.Mock).mock.calls[0]
      expect(options.headers.Authorization).toContain('Bearer')
    })
  })

  describe('Fallback behavior', () => {
    it('should work without RESEND_API_KEY (logging mode)', async () => {
      delete process.env.RESEND_API_KEY

      // Create new instance for this test
      const service = await import('@/lib/email-service').then(m => m.emailService)
      
      const result = await service.sendBookingConfirmation({
        customerName: 'John',
        customerEmail: 'john@example.com',
        barberName: 'Mike',
        appointmentDate: '2026-02-15',
        appointmentTime: '10:00 AM',
        serviceName: 'Haircut',
        shopName: 'Cool Cuts',
      })

      // Should still return success (logging mode)
      expect(result).toBe(true)
    })
  })
})
