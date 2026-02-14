import { NextRequest } from 'next/server'
import { PATCH, POST } from '../[id]/cancel/route'
import { query } from '@/lib/db'
import { cancellationService } from '@/lib/cancellation-service'
import { emailService } from '@/lib/email-service'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@/lib/cancellation-service')
jest.mock('@/lib/email-service')
jest.mock('@/lib/logger', () => ({
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
const mockCancellationService = cancellationService as jest.Mocked<typeof cancellationService>
const mockEmailService = emailService as jest.Mocked<typeof emailService>

describe('POST /api/appointments/[id]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PATCH endpoint', () => {
    it('should return 404 if appointment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Personal reasons' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Appointment not found')
    })

    it('should process cancellation with fee', async () => {
      const appointmentTime = new Date(Date.now() + 12 * 60 * 60 * 1000)

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              shop_id: 1,
              status: 'confirmed',
              customer_name: 'John Doe',
              customer_email: 'john@example.com',
              start_time: appointmentTime.toISOString(),
              customer_phone: '555-1234',
              barber_name: 'Mike',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ name: 'Test Barbershop' }],
          rowCount: 1,
        })

      mockCancellationService.cancelAppointment.mockResolvedValueOnce({
        success: true,
        appointmentId: '123',
        fee: 20,
        hoursBefore: 12,
        message: 'Appointment cancelled. A cancellation fee of $20.00 will be applied.',
      })

      mockEmailService.sendCancellationConfirmation.mockResolvedValueOnce(true)

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Personal reasons' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.appointment.cancellationFee).toBe(20)
      expect(data.appointment.status).toBe('cancelled')
    })

    it('should send cancellation email after successful cancellation', async () => {
      const appointmentTime = new Date(Date.now() + 48 * 60 * 60 * 1000)

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              shop_id: 1,
              status: 'confirmed',
              customer_name: 'Jane Smith',
              customer_email: 'jane@example.com',
              start_time: appointmentTime.toISOString(),
              customer_phone: '555-5678',
              barber_name: 'Sarah',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ name: 'Premium Barbershop' }],
          rowCount: 1,
        })

      mockCancellationService.cancelAppointment.mockResolvedValueOnce({
        success: true,
        appointmentId: '123',
        fee: 0,
        hoursBefore: 48,
        message: 'Appointment cancelled successfully. No cancellation fee.',
      })

      mockEmailService.sendCancellationConfirmation.mockResolvedValueOnce(true)

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })

      expect(mockEmailService.sendCancellationConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          customerEmail: 'jane@example.com',
          customerName: 'Jane Smith',
        })
      )
    })

    it('should continue even if email sending fails', async () => {
      const appointmentTime = new Date(Date.now() + 12 * 60 * 60 * 1000)

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              shop_id: 1,
              status: 'confirmed',
              customer_name: 'John Doe',
              customer_email: 'john@example.com',
              start_time: appointmentTime.toISOString(),
              customer_phone: '555-1234',
              barber_name: 'Mike',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ name: 'Test Barbershop' }],
          rowCount: 1,
        })

      mockCancellationService.cancelAppointment.mockResolvedValueOnce({
        success: true,
        appointmentId: '123',
        fee: 20,
        hoursBefore: 12,
        message: 'Appointment cancelled. A cancellation fee of $20.00 will be applied.',
      })

      mockEmailService.sendCancellationConfirmation.mockRejectedValueOnce(
        new Error('Email service error')
      )

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Personal reasons' }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(200) // Should still succeed
      expect(data.success).toBe(true)
    })

    it('should return error if cancellation validation fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            shop_id: 1,
            status: 'confirmed',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Past appointment
            customer_phone: '555-1234',
            barber_name: 'Mike',
          },
        ],
        rowCount: 1,
      })

      mockCancellationService.cancelAppointment.mockResolvedValueOnce({
        success: false,
        appointmentId: '123',
        fee: 0,
        hoursBefore: -2,
        message: 'Cannot cancel past appointments',
        error: 'Cannot cancel past appointments',
      })

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot cancel past appointments')
    })

    it('should handle empty request body', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            shop_id: 1,
            status: 'confirmed',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            customer_phone: '555-1234',
            barber_name: 'Mike',
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ name: 'Test Barbershop' }],
        rowCount: 1,
      })

      mockCancellationService.cancelAppointment.mockResolvedValueOnce({
        success: true,
        appointmentId: '123',
        fee: 0,
        hoursBefore: 24,
        message: 'Appointment cancelled successfully. No cancellation fee.',
      })

      mockEmailService.sendCancellationConfirmation.mockResolvedValueOnce(true)

      // Create request with empty body
      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'PATCH',
        body: '',
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST endpoint (token-based cancellation)', () => {
    it('should require token', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'POST',
        body: JSON.stringify({ reason: 'test' }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('token')
    })

    it('should validate token before processing cancellation', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            customer_email: 'test@example.com',
          },
        ],
        rowCount: 1,
      })

      const request = new NextRequest('http://localhost:3000/api/appointments/123/cancel', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          reason: 'test',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: '123' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid')
    })

    it('should return 404 if appointment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const request = new NextRequest('http://localhost:3000/api/appointments/999/cancel', {
        method: 'POST',
        body: JSON.stringify({
          token: 'some-token',
          reason: 'test',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: '999' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Appointment not found')
    })
  })
})
