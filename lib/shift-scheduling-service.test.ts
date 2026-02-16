import * as shiftService from './shift-scheduling-service'
import * as db from './db'

// Mock the db module
jest.mock('./db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}))

describe('Shift Scheduling Service', () => {
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============ SHIFT TEMPLATES ============

  describe('createShiftTemplate', () => {
    it('should create a new shift template', async () => {
      const mockTemplate = {
        id: 1,
        shop_id: 1,
        name: 'Morning Shift',
        start_time: '09:00',
        end_time: '13:00',
        min_barbers_required: 1,
        max_barbers_allowed: 3,
        is_active: true,
        created_at: new Date(),
      }

      mockQuery.mockResolvedValue({ rows: [mockTemplate], rowCount: 1 })

      const result = await shiftService.createShiftTemplate(1, 'Morning Shift', '09:00', '13:00')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shift_templates'),
        expect.any(Array)
      )
      expect(result).toEqual(mockTemplate)
    })

    it('should accept optional parameters', async () => {
      const mockTemplate = { id: 1, name: 'Test' }
      mockQuery.mockResolvedValue({ rows: [mockTemplate], rowCount: 1 })

      await shiftService.createShiftTemplate(1, 'Test', '09:00', '17:00', {
        minBarbersRequired: 2,
        recurringPattern: 'weekdays',
      })

      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('getShiftTemplates', () => {
    it('should fetch all active shift templates for a shop', async () => {
      const mockTemplates = [
        { id: 1, name: 'Morning Shift', start_time: '09:00' },
        { id: 2, name: 'Afternoon Shift', start_time: '13:00' },
      ]

      mockQuery.mockResolvedValue({ rows: mockTemplates, rowCount: 2 })

      const result = await shiftService.getShiftTemplates(1)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM shift_templates WHERE shop_id = $1'),
        [1]
      )
      expect(result).toEqual(mockTemplates)
    })
  })

  describe('updateShiftTemplate', () => {
    it('should update a shift template', async () => {
      const mockTemplate = { id: 1, name: 'Updated Morning Shift' }
      mockQuery.mockResolvedValue({ rows: [mockTemplate], rowCount: 1 })

      const result = await shiftService.updateShiftTemplate(1, 1, { name: 'Updated Morning Shift' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shift_templates'),
        expect.any(Array)
      )
      expect(result).toEqual(mockTemplate)
    })

    it('should throw error if template not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await expect(
        shiftService.updateShiftTemplate(999, 1, { name: 'Updated' })
      ).rejects.toThrow('Shift template not found')
    })

    it('should throw error if no fields to update', async () => {
      await expect(
        shiftService.updateShiftTemplate(1, 1, {})
      ).rejects.toThrow('No fields to update')
    })
  })

  describe('deleteShiftTemplate', () => {
    it('should deactivate a shift template', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 })

      await shiftService.deleteShiftTemplate(1, 1)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shift_templates SET is_active = false'),
        [1, 1]
      )
    })

    it('should throw error if template not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 })

      await expect(shiftService.deleteShiftTemplate(999, 1)).rejects.toThrow(
        'Shift template not found'
      )
    })
  })

  // ============ BARBER AVAILABILITY ============

  describe('setBarberAvailability', () => {
    it('should set barber availability for a day', async () => {
      const mockAvailability = {
        id: 1,
        shop_id: 1,
        barber_id: 1,
        day_of_week: 1,
        is_available: true,
        preference_level: 'preferred',
      }

      mockQuery.mockResolvedValue({ rows: [mockAvailability], rowCount: 1 })

      const result = await shiftService.setBarberAvailability(1, 1, 1, true, {
        preferenceLevel: 'preferred',
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO barber_availability'),
        expect.any(Array)
      )
      expect(result).toEqual(mockAvailability)
    })
  })

  describe('getBarberAvailability', () => {
    it('should fetch barber availability for all days', async () => {
      const mockAvailability = [
        { day_of_week: 1, is_available: true },
        { day_of_week: 2, is_available: true },
      ]

      mockQuery.mockResolvedValue({ rows: mockAvailability, rowCount: 2 })

      const result = await shiftService.getBarberAvailability(1, 1)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM barber_availability'),
        [1, 1]
      )
      expect(result).toEqual(mockAvailability)
    })
  })

  // ============ BARBER SHIFTS ============

  describe('assignBarberToShift', () => {
    it('should assign a barber to a shift', async () => {
      const mockShift = {
        id: 1,
        barber_id: 1,
        shift_date: '2026-02-17',
        start_time: '09:00',
        end_time: '17:00',
      }

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No conflicts
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No time-off
      mockQuery.mockResolvedValueOnce({ rows: [mockShift], rowCount: 1 }) // Insert
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }) // Log history

      const result = await shiftService.assignBarberToShift(
        1,
        1,
        '2026-02-17',
        '09:00',
        '17:00'
      )

      expect(mockQuery).toHaveBeenCalled()
      expect(result).toEqual(mockShift)
    })

    it('should throw error if shift conflicts exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      }) // Conflict found

      await expect(
        shiftService.assignBarberToShift(1, 1, '2026-02-17', '09:00', '17:00')
      ).rejects.toThrow('Shift conflict')
    })

    it('should throw error if barber has time-off', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No conflicts
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      }) // Time-off found

      await expect(
        shiftService.assignBarberToShift(1, 1, '2026-02-17', '09:00', '17:00')
      ).rejects.toThrow('time-off')
    })
  })

  describe('getBarberShifts', () => {
    it('should fetch barber shifts for a date range', async () => {
      const mockShifts = [
        { id: 1, shift_date: '2026-02-17', start_time: '09:00' },
        { id: 2, shift_date: '2026-02-18', start_time: '09:00' },
      ]

      mockQuery.mockResolvedValue({ rows: mockShifts, rowCount: 2 })

      const result = await shiftService.getBarberShifts(1, 1, '2026-02-17', '2026-02-18')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM barber_shifts'),
        expect.any(Array)
      )
      expect(result).toEqual(mockShifts)
    })
  })

  describe('deleteBarberShift', () => {
    it('should soft delete a shift', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }) // Delete
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }) // Log history

      await shiftService.deleteBarberShift(1, 1)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE barber_shifts SET deleted_at'),
        expect.any(Array)
      )
    })

    it('should throw error if shift not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 })

      await expect(shiftService.deleteBarberShift(999, 1)).rejects.toThrow('Shift not found')
    })
  })

  // ============ TIME OFF REQUESTS ============

  describe('requestTimeOff', () => {
    it('should create a time-off request', async () => {
      const mockRequest = {
        id: 1,
        barber_id: 1,
        start_date: '2026-02-20',
        end_date: '2026-02-25',
        status: 'pending',
      }

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No conflicts
      mockQuery.mockResolvedValueOnce({ rows: [mockRequest], rowCount: 1 }) // Insert

      const result = await shiftService.requestTimeOff(1, 1, '2026-02-20', '2026-02-25')

      expect(result).toEqual(mockRequest)
    })

    it('should throw error if dates are reversed', async () => {
      await expect(
        shiftService.requestTimeOff(1, 1, '2026-02-25', '2026-02-20')
      ).rejects.toThrow('Start date must be before end date')
    })

    it('should throw error if requesting past time-off', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const dateStr = pastDate.toISOString().split('T')[0]

      await expect(
        shiftService.requestTimeOff(1, 1, dateStr, '2026-02-25')
      ).rejects.toThrow('past')
    })

    it('should throw error if already approved time-off exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      }) // Conflict found

      await expect(
        shiftService.requestTimeOff(1, 1, '2026-02-20', '2026-02-25')
      ).rejects.toThrow('already have approved time-off')
    })
  })

  describe('approveTimeOff', () => {
    it('should approve a time-off request and cancel shifts', async () => {
      const mockRequest = {
        id: 1,
        barber_id: 1,
        start_date: '2026-02-20',
        end_date: '2026-02-25',
        status: 'approved',
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockRequest], rowCount: 1 }) // Get request
      mockQuery.mockResolvedValueOnce({ rowCount: 2 }) // Cancel shifts
      mockQuery.mockResolvedValueOnce({ rows: [mockRequest], rowCount: 1 }) // Update request

      const result = await shiftService.approveTimeOff(1, 1, 1)

      expect(result).toEqual(mockRequest)
    })

    it('should throw error if request not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(shiftService.approveTimeOff(999, 1, 1)).rejects.toThrow('not found')
    })
  })

  describe('denyTimeOff', () => {
    it('should deny a time-off request', async () => {
      const mockRequest = {
        id: 1,
        status: 'denied',
        denial_reason: 'Insufficient coverage',
      }

      mockQuery.mockResolvedValue({ rows: [mockRequest], rowCount: 1 })

      const result = await shiftService.denyTimeOff(1, 1, 1, 'Insufficient coverage')

      expect(result).toEqual(mockRequest)
    })
  })

  // ============ SHIFT SWAPS ============

  describe('requestShiftSwap', () => {
    it('should create a shift swap request', async () => {
      const mockSwap = {
        id: 1,
        requesting_barber_id: 1,
        requested_barber_id: 2,
        shift_id_to_give: 1,
        shift_id_to_receive: 2,
        status: 'pending',
      }

      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, barber_id: 1 },
          { id: 2, barber_id: 2 },
        ],
        rowCount: 2,
      }) // Get shifts
      mockQuery.mockResolvedValueOnce({ rows: [mockSwap], rowCount: 1 }) // Create swap

      const result = await shiftService.requestShiftSwap(1, 1, 2, 1, 2)

      expect(result).toEqual(mockSwap)
    })

    it('should throw error if shifts not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(shiftService.requestShiftSwap(1, 1, 2, 1, 2)).rejects.toThrow('not found')
    })
  })

  // ============ COVERAGE ANALYTICS ============

  describe('getShiftCoverage', () => {
    it('should calculate shift coverage', async () => {
      // Mock shift templates
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            start_time: '09:00',
            end_time: '13:00',
            min_barbers_required: 1,
            day_of_week: 1,
            is_open: true,
            recurring_days: '[1, 2, 3, 4, 5]',
          },
        ],
        rowCount: 1,
      })

      // Mock assigned barbers
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'John' }],
        rowCount: 1,
      })

      const result = await shiftService.getShiftCoverage(1, '2026-02-16', '2026-02-17')

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('shiftDate')
        expect(result[0]).toHaveProperty('status')
      }
    })
  })
})
