import CancellationService from './cancellation-service'

// Mock the database module
jest.mock('./db', () => ({
  query: jest.fn(),
}))

import { query } from './db'
const mockQuery = query as jest.MockedFunction<typeof query>

describe('CancellationService', () => {
  let service: CancellationService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new CancellationService({
      minFee: 15,
      maxFee: 25,
      cancellationWindowHours: 24,
    })
  })

  describe('calculateFee', () => {
    it('should return 0 fee if cancelled 24+ hours before appointment', () => {
      const fee = service.calculateFee(24)
      expect(fee).toBe(0)
    })

    it('should return 0 fee if cancelled more than 24 hours before', () => {
      const fee = service.calculateFee(48)
      expect(fee).toBe(0)
    })

    it('should return maxFee if cancelled at appointment time', () => {
      const fee = service.calculateFee(0)
      expect(fee).toBe(25)
    })

    it('should return maxFee if cancelled after appointment time', () => {
      const fee = service.calculateFee(-1)
      expect(fee).toBe(25)
    })

    it('should return a fee between minFee and maxFee for mid-window cancellations', () => {
      const fee = service.calculateFee(12) // 12 hours before
      expect(fee).toBeGreaterThanOrEqual(15)
      expect(fee).toBeLessThanOrEqual(25)
    })

    it('should scale linearly within cancellation window', () => {
      const feeAt12h = service.calculateFee(12) // Exactly halfway
      const feeAt6h = service.calculateFee(6)
      const feeAt0h = service.calculateFee(0)

      expect(feeAt12h).toBeLessThan(feeAt6h)
      expect(feeAt6h).toBeLessThan(feeAt0h)
    })

    it('should enforce minimum fee of 15', () => {
      const fee = service.calculateFee(23.5) // Just under 24 hours
      expect(fee).toBeGreaterThanOrEqual(15)
    })
  })

  describe('validateCancellation', () => {
    it('should return invalid if appointment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await service.validateCancellation('123', 1)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Appointment not found')
    })

    it('should return invalid if appointment already cancelled', async () => {
      const futureTime = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            status: 'cancelled',
            start_time: futureTime.toISOString(),
            created_at: new Date().toISOString(),
            shop_id: 1,
          },
        ],
        rowCount: 1,
      })

      const result = await service.validateCancellation('123', 1)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Appointment already cancelled')
    })

    it('should return invalid if appointment is in the past', async () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            status: 'confirmed',
            start_time: pastTime.toISOString(),
            created_at: new Date().toISOString(),
            shop_id: 1,
          },
        ],
        rowCount: 1,
      })

      const result = await service.validateCancellation('123', 1)

      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Cannot cancel past appointments')
    })

    it('should return valid with 0 fee if cancelled 25+ hours before', async () => {
      const futureTime = new Date(Date.now() + 25 * 60 * 60 * 1000) // 25 hours from now
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            status: 'confirmed',
            start_time: futureTime.toISOString(),
            created_at: new Date().toISOString(),
            shop_id: 1,
          },
        ],
        rowCount: 1,
      })

      const result = await service.validateCancellation('123', 1)

      expect(result.isValid).toBe(true)
      expect(result.wouldIncurFee).toBe(false)
      expect(result.feeAmount).toBe(0)
    })

    it('should return valid with fee if cancelled within 24 hours', async () => {
      const futureTime = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            status: 'confirmed',
            start_time: futureTime.toISOString(),
            created_at: new Date().toISOString(),
            shop_id: 1,
          },
        ],
        rowCount: 1,
      })

      const result = await service.validateCancellation('123', 1)

      expect(result.isValid).toBe(true)
      expect(result.wouldIncurFee).toBe(true)
      expect(result.feeAmount).toBeGreaterThan(0)
      expect(result.feeAmount).toBeLessThanOrEqual(25)
    })
  })

  describe('cancelAppointment', () => {
    it('should fail if validation fails', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await service.cancelAppointment('123', 1, 'test reason')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Appointment not found')
    })

    it('should update appointment and create audit record on success', async () => {
      const futureTime = new Date(Date.now() + 12 * 60 * 60 * 1000)
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              status: 'confirmed',
              start_time: futureTime.toISOString(),
              created_at: new Date().toISOString(),
              shop_id: 1,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ customer_email: 'test@example.com' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT audit

      const result = await service.cancelAppointment('123', 1, 'Personal reasons')

      expect(result.success).toBe(true)
      expect(result.fee).toBeGreaterThan(0)
      expect(mockQuery).toHaveBeenCalledTimes(4)
    })

    it('should return 0 fee message if no fee is charged', async () => {
      const futureTime = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours away
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              status: 'confirmed',
              start_time: futureTime.toISOString(),
              created_at: new Date().toISOString(),
              shop_id: 1,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ customer_email: 'test@example.com' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await service.cancelAppointment('123', 1)

      expect(result.success).toBe(true)
      expect(result.fee).toBe(0)
      expect(result.message).toContain('No cancellation fee')
    })

    it('should include fee in message if fee is charged', async () => {
      const futureTime = new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours away
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '123',
              status: 'confirmed',
              start_time: futureTime.toISOString(),
              created_at: new Date().toISOString(),
              shop_id: 1,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ customer_email: 'test@example.com' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await service.cancelAppointment('123', 1)

      expect(result.success).toBe(true)
      expect(result.fee).toBeGreaterThan(0)
      expect(result.message).toContain('$')
    })
  })

  describe('getCancellationAudit', () => {
    it('should return audit records for shop', async () => {
      const auditRecords = [
        {
          id: '1',
          appointment_id: '123',
          customer_email: 'test@example.com',
          cancellation_fee: 20,
          reason: 'Emergency',
          cancelled_by: 'customer',
          cancelled_at: new Date().toISOString(),
        },
      ]

      mockQuery.mockResolvedValueOnce({
        rows: auditRecords,
        rowCount: 1,
      })

      const result = await service.getCancellationAudit(1, 100, 0)

      expect(result).toEqual(auditRecords)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1, 100, 0]
      )
    })

    it('should handle pagination', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      await service.getCancellationAudit(1, 50, 100)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [1, 50, 100]
      )
    })
  })

  describe('getCancellationStats', () => {
    it('should return cancellation statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_cancellations: '5',
              total_fees: '100.00',
              avg_fee: '20.00',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              cancelled_count: 5,
              total_count: 20,
            },
          ],
          rowCount: 1,
        })

      const result = await service.getCancellationStats(1)

      expect(result.totalCancellations).toBe(5)
      expect(result.totalFeesCollected).toBe(100)
      expect(result.averageFee).toBe(20)
      expect(result.cancellationRate).toBe(25) // 5/20 = 25%
    })

    it('should handle no cancellations', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_cancellations: '0',
              total_fees: '0',
              avg_fee: '0',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              cancelled_count: 0,
              total_count: 10,
            },
          ],
          rowCount: 1,
        })

      const result = await service.getCancellationStats(1)

      expect(result.totalCancellations).toBe(0)
      expect(result.totalFeesCollected).toBe(0)
      expect(result.cancellationRate).toBe(0)
    })
  })

  describe('Custom configuration', () => {
    it('should use custom min and max fees', () => {
      const customService = new CancellationService({
        minFee: 10,
        maxFee: 50,
        cancellationWindowHours: 24,
      })

      const fee = customService.calculateFee(0) // At appointment time
      expect(fee).toBe(50)
    })

    it('should use custom cancellation window', async () => {
      const customService = new CancellationService({
        minFee: 15,
        maxFee: 25,
        cancellationWindowHours: 48, // 48 hours instead of 24
      })

      const futureTime = new Date(Date.now() + 36 * 60 * 60 * 1000) // 36 hours away
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            status: 'confirmed',
            start_time: futureTime.toISOString(),
            created_at: new Date().toISOString(),
            shop_id: 1,
          },
        ],
        rowCount: 1,
      })

      const result = await customService.validateCancellation('123', 1)

      expect(result.isValid).toBe(true)
      expect(result.wouldIncurFee).toBe(true) // Within 48-hour window
    })
  })
})
