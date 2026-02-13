import { logger } from './logger'

const rateLimitLogger = logger.createChild('rate-limiter')

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyPrefix?: string // Prefix for rate limit keys
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * In-memory rate limiter using sliding window algorithm
 * Suitable for single-instance deployments
 * For distributed systems, use Redis-based limiter instead
 */
class RateLimiter {
  private store: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate-limit:',
      ...config,
    }

    // Cleanup old entries every minute
    this.startCleanupInterval()
  }

  /**
   * Check if request is allowed
   * Returns rate limit info and whether to allow the request
   */
  isAllowed(key: string): RateLimitResult {
    const fullKey = `${this.config.keyPrefix}${key}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get or create request timestamps for this key
    let timestamps = this.store.get(fullKey) || []

    // Remove timestamps outside the window
    timestamps = timestamps.filter(time => time > windowStart)

    const requestCount = timestamps.length
    const allowed = requestCount < this.config.maxRequests

    if (allowed) {
      // Add current request timestamp
      timestamps.push(now)
      this.store.set(fullKey, timestamps)

      rateLimitLogger.debug('Request allowed', {
        key,
        count: timestamps.length,
        limit: this.config.maxRequests,
      })
    } else {
      rateLimitLogger.warn('Rate limit exceeded', {
        key,
        count: requestCount,
        limit: this.config.maxRequests,
      })
    }

    const oldestTimestamp = timestamps[0] || now
    const resetAt = oldestTimestamp + this.config.windowMs

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - timestamps.length),
      resetAt,
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    const fullKey = `${this.config.keyPrefix}${key}`
    this.store.delete(fullKey)
    rateLimitLogger.debug('Rate limit reset', { key })
  }

  /**
   * Get current rate limit status without consuming a slot
   */
  getStatus(key: string): RateLimitResult {
    const fullKey = `${this.config.keyPrefix}${key}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    const timestamps = (this.store.get(fullKey) || []).filter(time => time > windowStart)
    const oldestTimestamp = timestamps[0] || now
    const resetAt = oldestTimestamp + this.config.windowMs

    return {
      allowed: timestamps.length < this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - timestamps.length),
      resetAt,
    }
  }

  /**
   * Start periodic cleanup of old entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      for (const [key, timestamps] of this.store.entries()) {
        const validTimestamps = timestamps.filter(time => time > windowStart)

        if (validTimestamps.length === 0) {
          this.store.delete(key)
        } else {
          this.store.set(key, validTimestamps)
        }
      }

      if (this.store.size > 0) {
        rateLimitLogger.debug('Cleanup completed', { activeKeys: this.store.size })
      }
    }, 60000) // Every minute
  }

  /**
   * Get store size for monitoring
   */
  getStoreSize(): number {
    return this.store.size
  }
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // API routes: 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api:',
  } as RateLimitConfig,

  // Login endpoint: 5 attempts per 15 minutes (prevents brute force)
  login: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'login:',
  } as RateLimitConfig,

  // Signup endpoint: 3 attempts per hour
  signup: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'signup:',
  } as RateLimitConfig,

  // Booking endpoint: 10 per minute (user-level)
  booking: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'booking:',
  } as RateLimitConfig,

  // Payment endpoint: 5 per minute (prevent abuse)
  payment: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'payment:',
  } as RateLimitConfig,
}

// Create rate limiters for common endpoints
export const apiLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.api)
export const loginLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.login)
export const signupLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.signup)
export const bookingLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.booking)
export const paymentLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.payment)

export { RateLimiter }

export default apiLimiter
