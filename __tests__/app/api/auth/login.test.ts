import { POST } from '@/app/api/auth/login/route'
import { NextRequest } from 'next/server'
import { passwordService } from '@/lib/password-service'

// Mock dependencies
jest.mock('@/lib/db')
jest.mock('@/lib/jwt-auth')
jest.mock('@/lib/password-service')
jest.mock('@/lib/rate-limiter')

const { query } = require('@/lib/db')
const { jwtAuth } = require('@/lib/jwt-auth')
const { loginLimiter } = require('@/lib/rate-limiter')

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reject invalid email', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Validation failed')
  })

  it('should reject missing password', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should rate limit after 5 attempts', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: false,
      resetAt: Date.now() + 60000,
    })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)

    const data = await response.json()
    expect(data.error).toContain('Too many login attempts')
  })

  it('should reject non-existent user', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: true,
      remaining: 4,
    })

    query.mockResolvedValue({ rowCount: 0 })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('Invalid email or password')
  })

  it('should reject wrong password', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: true,
      remaining: 4,
    })

    query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 'user_123',
          email: 'test@example.com',
          password_hash: '$2b$10$hashedpassword',
          role: 'customer',
          shop_id: null,
        },
      ],
    })

    ;(passwordService.verifyPassword as jest.Mock).mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should successfully login with correct credentials', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: true,
      remaining: 4,
    })

    query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 'user_123',
          email: 'test@example.com',
          password_hash: '$2b$10$hashedpassword',
          role: 'customer',
          shop_id: null,
        },
      ],
    })

    ;(passwordService.verifyPassword as jest.Mock).mockResolvedValue(true)
    ;(passwordService.needsRehashing as jest.Mock).mockResolvedValue(false)

    jwtAuth.generateTokenPair.mockResolvedValue({
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 900,
    })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'correctpassword',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('test@example.com')
    expect(data.accessToken).toBe('access_token_123')
    expect(data.refreshToken).toBe('refresh_token_123')
  })

  it('should update last login time', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: true,
      remaining: 4,
    })

    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user_123',
          email: 'test@example.com',
          password_hash: '$2b$10$hashedpassword',
          role: 'customer',
          shop_id: null,
        },
      ],
    }).mockResolvedValueOnce({ rowCount: 1 }) // last_login_at update

    ;(passwordService.verifyPassword as jest.Mock).mockResolvedValue(true)
    ;(passwordService.needsRehashing as jest.Mock).mockResolvedValue(false)

    jwtAuth.generateTokenPair.mockResolvedValue({
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 900,
    })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'correctpassword',
      }),
    })

    await POST(request)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('last_login_at'),
      expect.any(Array)
    )
  })

  it('should rehash password if cost factor is old', async () => {
    loginLimiter.isAllowed.mockReturnValue({
      allowed: true,
      remaining: 4,
    })

    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'user_123',
          email: 'test@example.com',
          password_hash: '$2a$08$oldhash', // Cost factor 8
          role: 'customer',
          shop_id: null,
        },
      ],
    }).mockResolvedValueOnce({ rowCount: 1 }) // password rehash
      .mockResolvedValueOnce({ rowCount: 1 }) // last_login_at update

    ;(passwordService.verifyPassword as jest.Mock).mockResolvedValue(true)
    ;(passwordService.needsRehashing as jest.Mock).mockResolvedValue(true)
    ;(passwordService.hashPassword as jest.Mock).mockResolvedValue(
      '$2b$10$newhash'
    )

    jwtAuth.generateTokenPair.mockResolvedValue({
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 900,
    })

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'correctpassword',
      }),
    })

    await POST(request)

    // Should have called rehash
    expect(passwordService.hashPassword).toHaveBeenCalledWith('correctpassword')
  })
})
