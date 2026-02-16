import { NextRequest } from 'next/server'
import * as jwt from 'jsonwebtoken'

// Mock JWT
jest.mock('jsonwebtoken')
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    createChild: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}))

// Mock shift service
jest.mock('@/lib/shift-scheduling-service', () => ({
  getShiftTemplates: jest.fn(),
  createShiftTemplate: jest.fn(),
  updateShiftTemplate: jest.fn(),
  deleteShiftTemplate: jest.fn(),
  assignBarberToShift: jest.fn(),
  getShiftBoard: jest.fn(),
  updateBarberShift: jest.fn(),
  deleteBarberShift: jest.fn(),
  getShiftCoverage: jest.fn(),
}))

describe('Shift API Routes', () => {
  const mockToken = 'mock-token'
  const mockShopId = 1

  beforeEach(() => {
    jest.clearAllMocks()
    mockJwtVerify.mockReturnValue({ shopId: mockShopId, userId: 1 } as any)
  })

  describe('GET /api/shifts/templates', () => {
    it('should return 401 without authorization token', async () => {
      const { GET } = await import('@/app/api/shifts/templates/route')

      const request = new NextRequest('http://localhost/api/shifts/templates', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should return shift templates with valid token', async () => {
      const { GET } = await import('@/app/api/shifts/templates/route')
      const mockTemplates = [{ id: 1, name: 'Morning Shift' }]

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.getShiftTemplates.mockResolvedValue(mockTemplates)

      const request = new NextRequest('http://localhost/api/shifts/templates', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.templates).toEqual(mockTemplates)
    })
  })

  describe('POST /api/shifts/templates', () => {
    it('should create a shift template with valid data', async () => {
      const { POST } = await import('@/app/api/shifts/templates/route')
      const mockTemplate = {
        id: 1,
        name: 'Morning Shift',
        start_time: '09:00',
        end_time: '13:00',
      }

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.createShiftTemplate.mockResolvedValue(mockTemplate)

      const request = new NextRequest('http://localhost/api/shifts/templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Morning Shift',
          startTime: '09:00',
          endTime: '13:00',
        }),
      } as any)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.template).toEqual(mockTemplate)
    })

    it('should return validation error with invalid data', async () => {
      const { POST } = await import('@/app/api/shifts/templates/route')

      const request = new NextRequest('http://localhost/api/shifts/templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          startTime: '09:00',
        }),
      } as any)

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/shifts/[id]', () => {
    it('should update a shift with valid data', async () => {
      const { PATCH } = await import('@/app/api/shifts/[id]/route')
      const mockShift = {
        id: 1,
        barber_id: 1,
        status: 'confirmed',
      }

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.updateBarberShift.mockResolvedValue(mockShift)

      const request = new NextRequest('http://localhost/api/shifts/1', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'confirmed',
        }),
      } as any)

      const response = await PATCH(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.shift).toEqual(mockShift)
    })

    it('should return 404 if shift not found', async () => {
      const { PATCH } = await import('@/app/api/shifts/[id]/route')

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.updateBarberShift.mockRejectedValue(new Error('Shift not found'))

      const request = new NextRequest('http://localhost/api/shifts/999', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'confirmed',
        }),
      } as any)

      const response = await PATCH(request, { params: { id: '999' } })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/shifts/board', () => {
    it('should return shift board with date range', async () => {
      const { GET } = await import('@/app/api/shifts/board/route')
      const mockShifts = [
        {
          id: 1,
          shift_date: '2026-02-17',
          start_time: '09:00',
          barber_name: 'John',
        },
      ]

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.getShiftBoard.mockResolvedValue(mockShifts)

      const url = new URL('http://localhost/api/shifts/board')
      url.searchParams.append('startDate', '2026-02-16')
      url.searchParams.append('endDate', '2026-02-22')

      const request = new NextRequest(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.shifts).toEqual(mockShifts)
    })

    it('should return 400 without date parameters', async () => {
      const { GET } = await import('@/app/api/shifts/board/route')

      const request = new NextRequest('http://localhost/api/shifts/board', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/shifts/coverage', () => {
    it('should return coverage statistics', async () => {
      const { GET } = await import('@/app/api/shifts/coverage/route')
      const mockCoverage = [
        {
          shiftDate: '2026-02-17',
          startTime: '09:00',
          endTime: '13:00',
          assignedBarbers: 2,
          minimumRequired: 1,
          status: 'covered',
        },
      ]

      const shiftService = require('@/lib/shift-scheduling-service')
      shiftService.getShiftCoverage.mockResolvedValue(mockCoverage)

      const url = new URL('http://localhost/api/shifts/coverage')
      url.searchParams.append('startDate', '2026-02-16')
      url.searchParams.append('endDate', '2026-02-22')

      const request = new NextRequest(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.coverage)).toBe(true)
      expect(data.stats).toBeDefined()
    })
  })
})
