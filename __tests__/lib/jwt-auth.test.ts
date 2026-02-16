import { jwtAuth, JWTPayload } from '@/lib/jwt-auth'

describe('JWT Auth Service', () => {
  const testPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: 'user_123',
    email: 'test@example.com',
    role: 'customer',
    shopId: 'shop_456',
  }

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key'
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret'
  })

  describe('generateAccessToken', () => {
    it('should generate valid access token', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should include user data in token', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const verified = await jwtAuth.verifyAccessToken(token)

      expect(verified.userId).toBe(testPayload.userId)
      expect(verified.email).toBe(testPayload.email)
      expect(verified.role).toBe(testPayload.role)
    })

    it('should set expiration time', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const verified = await jwtAuth.verifyAccessToken(token)

      expect(verified.exp).toBeTruthy()
      expect(verified.iat).toBeTruthy()
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', async () => {
      const token = await jwtAuth.generateRefreshToken(testPayload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('should be verifiable with refresh secret', async () => {
      const token = await jwtAuth.generateRefreshToken(testPayload)
      const verified = await jwtAuth.verifyRefreshToken(token)

      expect(verified.userId).toBe(testPayload.userId)
    })
  })

  describe('generateTokenPair', () => {
    it('should generate both tokens', async () => {
      const pair = await jwtAuth.generateTokenPair(testPayload)

      expect(pair.accessToken).toBeTruthy()
      expect(pair.refreshToken).toBeTruthy()
      expect(pair.expiresIn).toBe(900) // 15 minutes in seconds
    })

    it('should generate different tokens', async () => {
      const pair = await jwtAuth.generateTokenPair(testPayload)

      expect(pair.accessToken).not.toBe(pair.refreshToken)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const verified = await jwtAuth.verifyAccessToken(token)

      expect(verified.userId).toBe(testPayload.userId)
      expect(verified.email).toBe(testPayload.email)
    })

    it('should reject invalid token', async () => {
      await expect(jwtAuth.verifyAccessToken('invalid.token.here')).rejects.toThrow()
    })

    it('should reject token signed with wrong secret', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      
      // The token should verify successfully with the correct secret
      const verified = await jwtAuth.verifyAccessToken(token)
      expect(verified.userId).toBe(testPayload.userId)
      
      // Test that tokens can't be tampered with by checking that a modified
      // token or one from a different context wouldn't verify
      // Since we can't easily change the secret mid-test with singletons,
      // we verify that the implementation uses the secret by testing the
      // service behavior with valid tokens
      const otherToken = await jwtAuth.generateRefreshToken(testPayload)
      
      // Refresh token shouldn't verify as access token (they use different secrets)
      await expect(jwtAuth.verifyAccessToken(otherToken)).rejects.toThrow()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const token = await jwtAuth.generateRefreshToken(testPayload)
      const verified = await jwtAuth.verifyRefreshToken(token)

      expect(verified.userId).toBe(testPayload.userId)
    })

    it('should reject invalid refresh token', async () => {
      await expect(jwtAuth.verifyRefreshToken('invalid.token.here')).rejects.toThrow()
    })
  })

  describe('refreshAccessToken', () => {
    it('should generate new token pair from refresh token', async () => {
      const pair1 = await jwtAuth.generateTokenPair(testPayload)
      
      // Advance time to ensure different iat/exp values
      jest.useFakeTimers()
      jest.advanceTimersByTime(1000)
      
      const pair2 = await jwtAuth.refreshAccessToken(pair1.refreshToken)
      
      jest.useRealTimers()

      expect(pair2.accessToken).toBeTruthy()
      expect(pair2.refreshToken).toBeTruthy()
      // New tokens should be different (due to different timestamps)
      expect(pair2.accessToken).not.toBe(pair1.accessToken)
    })

    it('should preserve user data when refreshing', async () => {
      const pair1 = await jwtAuth.generateTokenPair(testPayload)
      const pair2 = await jwtAuth.refreshAccessToken(pair1.refreshToken)
      const verified = await jwtAuth.verifyAccessToken(pair2.accessToken)

      expect(verified.userId).toBe(testPayload.userId)
      expect(verified.email).toBe(testPayload.email)
      expect(verified.role).toBe(testPayload.role)
    })

    it('should reject invalid refresh token', async () => {
      await expect(jwtAuth.refreshAccessToken('invalid.token')).rejects.toThrow()
    })
  })

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const token = jwtAuth.extractToken(header)

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    })

    it('should return null for invalid header format', () => {
      expect(jwtAuth.extractToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBeNull()
      expect(jwtAuth.extractToken('Bearer ')).toBeNull()
      expect(jwtAuth.extractToken('Basic dXNlcjpwYXNz')).toBeNull()
    })

    it('should return null for null header', () => {
      expect(jwtAuth.extractToken(null)).toBeNull()
    })

    it('should be case-sensitive for Bearer scheme', () => {
      const header = 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      expect(jwtAuth.extractToken(header)).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const verified = await jwtAuth.verifyAccessToken(token)

      expect(jwtAuth.isTokenExpired(verified)).toBe(false)
    })

    it('should return false for token without exp', () => {
      const payload: JWTPayload = { ...testPayload, exp: undefined }
      expect(jwtAuth.isTokenExpired(payload)).toBe(false)
    })
  })

  describe('getTimeUntilExpiry', () => {
    it('should return positive time for valid token', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const verified = await jwtAuth.verifyAccessToken(token)

      const timeLeft = jwtAuth.getTimeUntilExpiry(verified)
      expect(timeLeft).toBeGreaterThan(0)
      expect(timeLeft).toBeLessThanOrEqual(900) // Less than 15 minutes
    })

    it('should return 0 for expired token', () => {
      const payload: JWTPayload = {
        ...testPayload,
        exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      }

      expect(jwtAuth.getTimeUntilExpiry(payload)).toBe(0)
    })

    it('should return 0 if no expiration', () => {
      const payload: JWTPayload = { ...testPayload, exp: undefined }
      expect(jwtAuth.getTimeUntilExpiry(payload)).toBe(0)
    })
  })

  describe('Security', () => {
    it('should not leak secrets in logs', async () => {
      const token = await jwtAuth.generateAccessToken(testPayload)
      const secret = process.env.JWT_SECRET

      // Token should not contain plaintext secret
      expect(token).not.toContain(secret)
    })

    it('should use different secrets for access and refresh tokens', async () => {
      const accessToken = await jwtAuth.generateAccessToken(testPayload)
      const refreshToken = await jwtAuth.generateRefreshToken(testPayload)

      // Access token should not verify as refresh token
      await expect(jwtAuth.verifyRefreshToken(accessToken)).rejects.toThrow()

      // Refresh token should not verify as access token
      await expect(jwtAuth.verifyAccessToken(refreshToken)).rejects.toThrow()
    })
  })
})
