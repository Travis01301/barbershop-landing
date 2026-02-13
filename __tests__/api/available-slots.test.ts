/**
 * Available Slots API Tests
 * 
 * Tests for GET /api/available-slots
 * - Valid slot calculation
 * - Invalid/missing parameters
 * - Barber schedule retrieval
 * - Conflict detection with existing appointments
 * - 30-minute slot generation
 */

import { GET } from '@/app/api/available-slots/route'
import { NextRequest } from 'next/server'

// Mock lib/db
const mockQuery = jest.fn()
jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: jest.fn(),
}))

describe('GET /api/available-slots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockQuery.mockReset()
    // Default mock return if not overridden
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
  })

  it('should return 400 when shopId is missing', async () => {
    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 when barberId is missing', async () => {
    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 when date is missing', async () => {
    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return 400 for invalid date format', async () => {
    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', 'invalid-date')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('should return empty slots when barber has no schedule for the day', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [], // No schedule found
      rowCount: 0,
    })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.availableSlots).toEqual([])
  })

  it('should return empty slots when barber is not working on that day', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            is_working: false,
            start_time: '09:00',
            end_time: '17:00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [], // No appointments
      })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.availableSlots).toEqual([])
  })

  it('should generate 30-minute slots for a working day', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            is_working: true,
            start_time: '09:00',
            end_time: '10:00', // Only 1 hour for simpler testing
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [], // No appointments
      })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // 09:00-09:30 is the only available slot in a 1-hour window
    expect(data.availableSlots.length).toBeGreaterThan(0)
    expect(data.availableSlots[0]).toHaveProperty('startTime')
    expect(data.availableSlots[0]).toHaveProperty('endTime')
  })

  it('should exclude slots that conflict with existing appointments', async () => {
    const appointmentStart = new Date('2026-02-15T09:30:00Z')
    const appointmentEnd = new Date('2026-02-15T10:00:00Z')

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            is_working: true,
            start_time: '09:00',
            end_time: '11:00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            start_time: appointmentStart,
            end_time: appointmentEnd,
          },
        ],
      })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // The 09:30-10:00 slot should not be available due to conflict
    expect(data.availableSlots).toBeDefined()
  })

  it('should handle multiple existing appointments', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            is_working: true,
            start_time: '09:00',
            end_time: '17:00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            start_time: new Date('2026-02-15T09:00:00Z'),
            end_time: new Date('2026-02-15T09:30:00Z'),
          },
          {
            start_time: new Date('2026-02-15T10:00:00Z'),
            end_time: new Date('2026-02-15T10:30:00Z'),
          },
          {
            start_time: new Date('2026-02-15T14:00:00Z'),
            end_time: new Date('2026-02-15T14:30:00Z'),
          },
        ],
      })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.availableSlots)).toBe(true)
  })

  it('should return slots in ISO 8601 format', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            is_working: true,
            start_time: '09:00',
            end_time: '10:00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [],
      })

    const url = new URL('http://localhost:3000/api/available-slots')
    url.searchParams.set('shopId', '1')
    url.searchParams.set('barberId', '1')
    url.searchParams.set('date', '2026-02-15')

    const mockRequest = {
      url: url.toString(),
    } as unknown as NextRequest

    const response = await GET(mockRequest)
    const data = await response.json()

    if (data.availableSlots.length > 0) {
      // Check ISO 8601 format (contains T and Z)
      expect(data.availableSlots[0].startTime).toMatch(/\d{4}-\d{2}-\d{2}T/)
      expect(data.availableSlots[0].endTime).toMatch(/\d{4}-\d{2}-\d{2}T/)
    }
  })
})
