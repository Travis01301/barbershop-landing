import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from './rate-limiter'
import { logger } from './logger'

const rateLimitLogger = logger.createChild('rate-limit-middleware')

/**
 * Extract client identifier (IP address or user ID)
 */
export function getClientId(request: NextRequest): string {
  // Try to get from headers (in order of preference)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'

  return clientIp.trim()
}

/**
 * Rate limit middleware
 * Returns 429 if rate limit exceeded
 */
export async function withRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  keyPrefix: string = ''
): Promise<{
  allowed: boolean
  response?: NextResponse
  status: any
}> {
  const clientId = getClientId(request)
  const key = keyPrefix ? `${keyPrefix}:${clientId}` : clientId

  const status = limiter.isAllowed(key)

  // Add rate limit headers to response
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', String(status.limit))
  headers.set('X-RateLimit-Remaining', String(status.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(status.resetAt / 1000)))

  if (!status.allowed) {
    const retryAfter = Math.ceil((status.resetAt - Date.now()) / 1000)
    headers.set('Retry-After', String(retryAfter))

    rateLimitLogger.warn('Rate limit response', {
      clientId,
      key,
      remaining: status.remaining,
      retryAfter,
    })

    const response = NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter,
      },
      { status: 429, headers }
    )

    return { allowed: false, response, status }
  }

  return { allowed: true, status }
}

/**
 * Wrapper for route handlers with rate limiting
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     return withRateLimitedHandler(request, loginLimiter, 'login', async (req) => {
 *       // Your handler code here
 *     })
 *   }
 */
export async function withRateLimitedHandler(
  request: NextRequest,
  limiter: RateLimiter,
  keyPrefix: string,
  handler: (req: NextRequest, headers: Headers) => Promise<NextResponse>
): Promise<NextResponse> {
  const { allowed, response, status } = await withRateLimit(request, limiter, keyPrefix)

  if (!allowed) {
    return response!
  }

  try {
    const handlerResponse = await handler(request, new Headers())

    // Add rate limit headers to the actual response
    handlerResponse.headers.set('X-RateLimit-Limit', String(status.limit))
    handlerResponse.headers.set('X-RateLimit-Remaining', String(status.remaining))
    handlerResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(status.resetAt / 1000)))

    return handlerResponse
  } catch (error) {
    rateLimitLogger.error('Error in rate limited handler', error)
    throw error
  }
}
