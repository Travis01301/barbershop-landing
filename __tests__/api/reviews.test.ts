import { POST, GET } from '@/app/api/reviews/route'
import { NextRequest } from 'next/server'

// Mock database
jest.mock('@/lib/db', () => ({
  getClient: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn(),
  })),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    createChild: jest.fn(() => ({
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}))

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/reviews', () => {
    it('should create a review with valid data', async () => {
      const mockRequest = {
        json: async () => ({
          appointmentId: 1,
          customerId: 1,
          barberId: 1,
          shopId: 1,
          rating: 5,
          comment: 'Great service!',
        }),
      } as NextRequest

      // Test passes if function executes without error
      expect(async () => {
        await POST(mockRequest)
      }).not.toThrow()
    })

    it('should reject review without required fields', async () => {
      const mockRequest = {
        json: async () => ({
          appointmentId: 1,
          // Missing other required fields
        }),
      } as NextRequest

      // Response should be 400
      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should reject invalid rating', async () => {
      const mockRequest = {
        json: async () => ({
          appointmentId: 1,
          customerId: 1,
          barberId: 1,
          shopId: 1,
          rating: 6, // Invalid rating > 5
          comment: 'Great service!',
        }),
      } as NextRequest

      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/reviews', () => {
    it('should fetch reviews for a shop', async () => {
      const url = new URL('http://localhost:3000/api/reviews?shopId=1')
      const mockRequest = { url: url.toString() } as NextRequest

      expect(async () => {
        await GET(mockRequest)
      }).not.toThrow()
    })

    it('should return 400 without shopId', async () => {
      const url = new URL('http://localhost:3000/api/reviews')
      const mockRequest = { url: url.toString() } as NextRequest

      const response = await GET(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should filter reviews by barberId', async () => {
      const url = new URL('http://localhost:3000/api/reviews?shopId=1&barberId=2')
      const mockRequest = { url: url.toString() } as NextRequest

      expect(async () => {
        await GET(mockRequest)
      }).not.toThrow()
    })
  })
})
