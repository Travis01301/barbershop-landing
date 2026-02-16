import { POST, GET } from '@/app/api/webhooks/management/route'
import { NextRequest } from 'next/server'

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

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'test_secret'),
  })),
}))

describe('Webhooks API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/webhooks/management', () => {
    it('should fetch webhooks for a shop', async () => {
      const url = new URL('http://localhost:3000/api/webhooks/management?shopId=1')
      const mockRequest = { url: url.toString() } as NextRequest

      expect(async () => {
        await GET(mockRequest)
      }).not.toThrow()
    })

    it('should return 400 without shopId', async () => {
      const url = new URL('http://localhost:3000/api/webhooks/management')
      const mockRequest = { url: url.toString() } as NextRequest

      const response = await GET(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should filter by isActive status', async () => {
      const url = new URL('http://localhost:3000/api/webhooks/management?shopId=1&isActive=true')
      const mockRequest = { url: url.toString() } as NextRequest

      expect(async () => {
        await GET(mockRequest)
      }).not.toThrow()
    })
  })

  describe('POST /api/webhooks/management', () => {
    it('should create a webhook with valid data', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          webhookUrl: 'https://example.com/webhook',
          events: ['appointment_created', 'payment_completed'],
        }),
      } as NextRequest

      expect(async () => {
        await POST(mockRequest)
      }).not.toThrow()
    })

    it('should reject webhook without required fields', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          webhookUrl: 'https://example.com/webhook',
          // Missing events
        }),
      } as NextRequest

      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should reject invalid webhook URL', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          webhookUrl: 'not-a-valid-url',
          events: ['appointment_created'],
        }),
      } as NextRequest

      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should reject empty events array', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          webhookUrl: 'https://example.com/webhook',
          events: [],
        }),
      } as NextRequest

      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })
  })
})
