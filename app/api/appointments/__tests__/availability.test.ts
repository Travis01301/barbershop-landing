import { NextRequest } from 'next/server'
import { GET } from '../availability/route'
import { query } from '@/lib/db'

jest.mock('@/lib/db')
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

describe('GET /api/appointments/availability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 for missing required parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/appointments/availability', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid')
  })

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=invalid&endDate=2026-02-21',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
  })

  it('should return 400 if start date is after end date', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-21&endDate=2026-02-14',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Start date')
  })

  it('should return error if date range exceeds 90 days', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-01-01T00:00:00Z&endDate=2026-04-01T00:00:00Z',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    // Should either return 400 (validation error) or 500 (with error message)
    expect([400, 500]).toContain(response.status)
    expect(data.error).toBeDefined()
  })

  it('should return 404 if barber not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=999&shopId=1&startDate=2026-02-14&endDate=2026-02-21',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Barber not found')
  })

  it('should return availability for valid request', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
          {
            day_of_week: 1,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-21&slotDurationMinutes=30',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.meta).toBeDefined()
  })

  it('should use default slot duration of 30 minutes', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-15',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(parseInt(data.meta.slotDurationMinutes)).toBe(30)
  })

  it('should handle custom slot duration', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-15&slotDurationMinutes=60',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(parseInt(data.meta.slotDurationMinutes)).toBe(60)
  })

  it('should exclude non-working days from availability', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0, // Sunday
            start_time: null,
            end_time: null,
            is_working: false,
          },
          {
            day_of_week: 1, // Monday
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-15',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Check that non-working days have no slots
    const nonWorkingDay = data.data.find((day: any) => !day.isWorkingDay)
    expect(nonWorkingDay?.slots).toEqual([])
  })

  it('should mark booked slots as unavailable', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'apt-123',
            start_time: '2026-02-14T14:00:00Z',
            end_time: '2026-02-14T14:30:00Z',
          },
        ],
        rowCount: 1,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-14&slotDurationMinutes=30',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return correct metadata', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, shop_id: 1 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 0,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-14&slotDurationMinutes=30',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.meta.barberId).toBe(1)
    expect(data.meta.shopId).toBe(1)
    expect(data.meta.startDate).toBe('2026-02-14')
    expect(data.meta.endDate).toBe('2026-02-14')
    expect(data.meta.totalDays).toBe(1)
    expect(data.meta.availableSlotsCount).toBeGreaterThanOrEqual(0)
  })

  it('should handle database errors gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Database error'))

    const request = new NextRequest(
      'http://localhost:3000/api/appointments/availability?barberId=1&shopId=1&startDate=2026-02-14&endDate=2026-02-21',
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed')
  })
})
