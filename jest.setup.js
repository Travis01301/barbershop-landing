// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill Request/Response for Next.js API route testing
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Web APIs
const { Request, Response, Headers } = require('node-fetch')
global.Request = Request
global.Response = Response
global.Headers = Headers

// Mock NextResponse for API route testing
jest.mock('next/server', () => {
  class MockNextRequest {
    constructor(url, init) {
      this.url = url
      this.method = init?.method || 'GET'
      this._body = init?.body
      try {
        this.nextUrl = new URL(url)
      } catch {
        this.nextUrl = { searchParams: new URLSearchParams() }
      }
    }
    async json() {
      return this._body ? JSON.parse(this._body) : {}
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body, init) => ({
        status: init?.status || 200,
        json: async () => body,
        body,
        _init: init,
      }),
    },
  }
})

// Mock environment variables for tests
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing'
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing'
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/barbershop_test'
process.env.NODE_ENV = 'test'

// Mock jose ESM module (can't be transformed by jest properly)
jest.mock('jose')

// Mock crypto.randomUUID for tests before any modules are loaded
const originalCrypto = global.crypto
global.crypto = {
  ...originalCrypto,
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
}

// Global test utilities
global.fetch = jest.fn()
