import { RateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter'

describe('Rate Limiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000, // 1 second window for testing
      maxRequests: 3,
      keyPrefix: 'test:',
    })
  })

  describe('isAllowed', () => {
    it('should allow requests under limit', () => {
      const result1 = limiter.isAllowed('user1')
      const result2 = limiter.isAllowed('user1')
      const result3 = limiter.isAllowed('user1')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('should reject requests over limit', () => {
      limiter.isAllowed('user2')
      limiter.isAllowed('user2')
      limiter.isAllowed('user2')
      const result4 = limiter.isAllowed('user2')

      expect(result4.allowed).toBe(false)
    })

    it('should track remaining requests', () => {
      const result1 = limiter.isAllowed('user3')

      expect(result1.remaining).toBe(2) // 3 - 1
    })

    it('should isolate limits per key', () => {
      limiter.isAllowed('user4')
      limiter.isAllowed('user5')

      const user4Result = limiter.isAllowed('user4')
      const user5Result = limiter.isAllowed('user5')

      expect(user4Result.remaining).toBe(1)
      expect(user5Result.remaining).toBe(1)
    })

    it('should return reset time', () => {
      const now = Date.now()
      const result = limiter.isAllowed('user6')

      expect(result.resetAt).toBeGreaterThan(now)
      expect(result.resetAt - now).toBeLessThanOrEqual(1000)
    })
  })

  describe('getStatus', () => {
    it('should return status without consuming request', () => {
      limiter.isAllowed('user7')
      const status = limiter.getStatus('user7')

      expect(status.remaining).toBe(2)

      const status2 = limiter.getStatus('user7')

      expect(status2.remaining).toBe(2) // Still 2, not consumed
    })

    it('should show allowed status', () => {
      limiter.isAllowed('user8')
      const status = limiter.getStatus('user8')

      expect(status.allowed).toBe(true)
    })

    it('should show denied status when over limit', () => {
      limiter.isAllowed('user9')
      limiter.isAllowed('user9')
      limiter.isAllowed('user9')

      const status = limiter.getStatus('user9')

      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset limit for key', () => {
      limiter.isAllowed('user10')
      limiter.isAllowed('user10')
      limiter.isAllowed('user10')

      limiter.reset('user10')

      const result = limiter.isAllowed('user10')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })
  })

  describe('Pre-configured limiters', () => {
    it('should have API limiter config', () => {
      expect(RATE_LIMIT_CONFIGS.api.maxRequests).toBe(100)
      expect(RATE_LIMIT_CONFIGS.api.windowMs).toBe(60 * 1000)
    })

    it('should have strict login limiter', () => {
      expect(RATE_LIMIT_CONFIGS.login.maxRequests).toBe(5)
      expect(RATE_LIMIT_CONFIGS.login.windowMs).toBe(15 * 60 * 1000)
    })

    it('should have signup limiter', () => {
      expect(RATE_LIMIT_CONFIGS.signup.maxRequests).toBe(3)
      expect(RATE_LIMIT_CONFIGS.signup.windowMs).toBe(60 * 60 * 1000)
    })

    it('should have booking limiter', () => {
      expect(RATE_LIMIT_CONFIGS.booking.maxRequests).toBe(10)
    })

    it('should have payment limiter', () => {
      expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(5)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty key', () => {
      const result = limiter.isAllowed('')

      expect(result.allowed).toBe(true)
    })

    it('should handle special characters in key', () => {
      const result = limiter.isAllowed('user@example.com:192.168.1.1')

      expect(result.allowed).toBe(true)
    })

    it('should store correct limit value', () => {
      const result = limiter.isAllowed('user11')

      expect(result.limit).toBe(3)
    })
  })

  describe('Sliding window behavior', () => {
    it('should allow requests after window expires', async () => {
      const windowLimiter = new RateLimiter({
        windowMs: 100, // 100ms window for fast testing
        maxRequests: 1,
      })

      const result1 = windowLimiter.isAllowed('sliding')
      expect(result1.allowed).toBe(true)

      const result2 = windowLimiter.isAllowed('sliding')
      expect(result2.allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      const result3 = windowLimiter.isAllowed('sliding')
      expect(result3.allowed).toBe(true)
    })
  })
})
