import { POST, GET } from '@/app/api/api-keys/route'
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
    toString: jest.fn(() => 'test_key_or_secret'),
  })),
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'test_hash'),
    })),
  })),
}))

describe('API Keys API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/api-keys', () => {
    it('should fetch API keys for a shop', async () => {
      const url = new URL('http://localhost:3000/api/api-keys?shopId=1')
      const mockRequest = { url: url.toString() } as NextRequest

      expect(async () => {
        await GET(mockRequest)
      }).not.toThrow()
    })

    it('should return 400 without shopId', async () => {
      const url = new URL('http://localhost:3000/api/api-keys')
      const mockRequest = { url: url.toString() } as NextRequest

      const response = await GET(mockRequest)
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/api-keys', () => {
    it('should create an API key with valid data', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          keyName: 'Test API Key',
          rateLimit: 5000,
        }),
      } as NextRequest

      expect(async () => {
        await POST(mockRequest)
      }).not.toThrow()
    })

    it('should reject API key without required fields', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          // Missing keyName
        }),
      } as NextRequest

      const response = await POST(mockRequest)
      expect(response.status).toBe(400)
    })

    it('should set default rate limit if not provided', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          keyName: 'Test API Key',
        }),
      } as NextRequest

      expect(async () => {
        await POST(mockRequest)
      }).not.toThrow()
    })

    it('should accept custom rate limit', async () => {
      const mockRequest = {
        json: async () => ({
          shopId: 1,
          keyName: 'Test API Key',
          rateLimit: 10000,
        }),
      } as NextRequest

      expect(async () => {
        await POST(mockRequest)
      }).not.toThrow()
    })
  })
})
