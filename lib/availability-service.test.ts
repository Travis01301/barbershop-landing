import AvailabilityService from './availability-service'
import { query } from './db'

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

const mockQuery = query as jest.MockedFunction<typeof query>

describe('AvailabilityService', () => {
  let service: AvailabilityService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AvailabilityService()
  })

  describe('checkSlotAvailability', () => {
    it('should return no conflict for available slot', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const startTime = new Date('2026-02-14T14:00:00')
      const endTime = new Date('2026-02-14T14:30:00')

      const result = await service.checkSlotAvailability(1, startTime, endTime)

      expect(result.hasConflict).toBe(false)
      expect(result.conflictingAppointmentId).toBeUndefined()
    })

    it('should return conflict for booked slot', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'apt-123',
            start_time: '2026-02-14T14:00:00Z',
            end_time: '2026-02-14T14:30:00Z',
          },
        ],
        rowCount: 1,
      })

      const startTime = new Date('2026-02-14T14:15:00')
      const endTime = new Date('2026-02-14T14:45:00')

      const result = await service.checkSlotAvailability(1, startTime, endTime)

      expect(result.hasConflict).toBe(true)
      expect(result.conflictingAppointmentId).toBe('apt-123')
    })

    it('should exclude specific appointment from conflict check', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const startTime = new Date('2026-02-14T14:00:00')
      const endTime = new Date('2026-02-14T14:30:00')

      await service.checkSlotAvailability(1, startTime, endTime, 'apt-123')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('id != $4'),
        expect.arrayContaining(['apt-123'])
      )
    })

    it('should return conflict for invalid time range', async () => {
      const startTime = new Date('2026-02-14T14:30:00')
      const endTime = new Date('2026-02-14T14:00:00')

      const result = await service.checkSlotAvailability(1, startTime, endTime)

      expect(result.hasConflict).toBe(true)
      expect(result.conflictingAppointmentId).toBe('INVALID_TIME_RANGE')
    })

    it('should detect overlapping appointments correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'apt-456',
            start_time: '2026-02-14T14:30:00Z',
            end_time: '2026-02-14T15:00:00Z',
          },
        ],
        rowCount: 1,
      })

      const startTime = new Date('2026-02-14T14:00:00')
      const endTime = new Date('2026-02-14T14:45:00')

      const result = await service.checkSlotAvailability(1, startTime, endTime)

      expect(result.hasConflict).toBe(true)
    })
  })

  describe('isBarberWorking', () => {
    it('should return true if barber is working on that day', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ is_working: true }],
        rowCount: 1,
      })

      const date = new Date('2026-02-14') // Saturday
      const result = await service.isBarberWorking(1, date)

      expect(result).toBe(true)
    })

    it('should return false if barber is not working on that day', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ is_working: false }],
        rowCount: 1,
      })

      const date = new Date('2026-02-15') // Sunday
      const result = await service.isBarberWorking(1, date)

      expect(result).toBe(false)
    })

    it('should return false if no schedule found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const date = new Date('2026-02-14')
      const result = await service.isBarberWorking(1, date)

      expect(result).toBe(false)
    })
  })

  describe('getBarberWorkingHours', () => {
    it('should return working hours for a working day', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ start_time: '09:00:00', end_time: '17:00:00' }],
        rowCount: 1,
      })

      const date = new Date('2026-02-14')
      const result = await service.getBarberWorkingHours(1, date)

      expect(result).toEqual({ start: '09:00:00', end: '17:00:00' })
    })

    it('should return null if barber not working', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const date = new Date('2026-02-15')
      const result = await service.getBarberWorkingHours(1, date)

      expect(result).toBeNull()
    })
  })

  describe('validateAppointmentTime', () => {
    it('should validate appointment within working hours', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ is_working: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ start_time: '09:00:00', end_time: '17:00:00' }],
          rowCount: 1,
        })

      const startTime = new Date('2026-02-14T10:00:00')
      const endTime = new Date('2026-02-14T10:30:00')

      const result = await service.validateAppointmentTime(1, startTime, endTime)

      expect(result.valid).toBe(true)
    })

    it('should reject appointment outside working hours', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ is_working: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ start_time: '09:00:00', end_time: '17:00:00' }],
          rowCount: 1,
        })

      const startTime = new Date('2026-02-14T18:00:00')
      const endTime = new Date('2026-02-14T18:30:00')

      const result = await service.validateAppointmentTime(1, startTime, endTime)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('between')
    })

    it('should reject appointment on non-working day', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ is_working: false }], rowCount: 1 })

      const startTime = new Date('2026-02-15T10:00:00')
      const endTime = new Date('2026-02-15T10:30:00')

      const result = await service.validateAppointmentTime(1, startTime, endTime)

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not working')
    })
  })

  describe('getNextAvailableSlot', () => {
    it('should find next available slot', async () => {
      // Mock for isBarberWorking check
      mockQuery
        .mockResolvedValueOnce({ rows: [{ is_working: true }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ start_time: '09:00:00', end_time: '17:00:00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No conflicts

      const startingFrom = new Date('2026-02-14T10:00:00')
      const result = await service.getNextAvailableSlot(1, 30, startingFrom)

      expect(result).not.toBeNull()
      if (result) {
        expect(result.start <= result.end).toBe(true)
      }
    })

    it('should skip non-working days', async () => {
      // First day not working, second day working
      mockQuery
        .mockResolvedValueOnce({ rows: [{ is_working: false }], rowCount: 1 }) // First day not working
        .mockResolvedValueOnce({ rows: [{ is_working: true }], rowCount: 1 }) // Second day working
        .mockResolvedValueOnce({
          rows: [{ start_time: '09:00:00', end_time: '17:00:00' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No conflicts

      const startingFrom = new Date('2026-02-15T10:00:00')
      const result = await service.getNextAvailableSlot(1, 30, startingFrom)

      expect(result).not.toBeNull()
    })
  })

  describe('logAvailabilityCheck', () => {
    it('should log availability check to audit table', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const startTime = new Date('2026-02-14T14:00:00')
      const endTime = new Date('2026-02-14T14:30:00')

      await service.logAvailabilityCheck(1, 1, startTime, endTime, 'booked', 'apt-123', false)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO availability_audit'),
        expect.arrayContaining([1, 1, 'booked', 'apt-123'])
      )
    })
  })

  describe('getAvailabilityStats', () => {
    it('should return availability statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { hour: '14', count: '8' }, // Ordered by count DESC
            { hour: '15', count: '6' },
            { hour: '9', count: '5' },
          ],
          rowCount: 3,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_appointments: '100',
              days_counted: '30',
            },
          ],
          rowCount: 1,
        })

      const stats = await service.getAvailabilityStats(1, 1, 30)

      expect(stats.bookingRate).toBeGreaterThan(0)
      expect(stats.averageDailyBookings).toBeGreaterThan(0)
      expect(stats.peakTimes.length).toBe(3)
      expect(stats.peakTimes[0].hour).toBe(14) // Most bookings at 14:00
      expect(stats.peakTimes[0].count).toBe(8)
    })

    it('should handle no appointments', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ total_appointments: '0', days_counted: '30' }],
          rowCount: 1,
        })

      const stats = await service.getAvailabilityStats(1, 1, 30)

      expect(stats.bookingRate).toBe(0)
      expect(stats.averageDailyBookings).toBe(0)
      expect(stats.peakTimes).toEqual([])
    })
  })

  describe('Error handling', () => {
    it('should handle database errors in checkSlotAvailability', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const startTime = new Date('2026-02-14T14:00:00')
      const endTime = new Date('2026-02-14T14:30:00')

      const result = await service.checkSlotAvailability(1, startTime, endTime)

      expect(result.hasConflict).toBe(true)
      expect(result.conflictingAppointmentId).toBe('ERROR_CHECKING_AVAILABILITY')
    })

    it('should handle errors in isBarberWorking', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'))

      const date = new Date('2026-02-14')
      const result = await service.isBarberWorking(1, date)

      expect(result).toBe(false)
    })
  })
})
