import { NextResponse, NextRequest } from 'next/server'
import { logger } from './logger'

const securityLogger = logger.createChild('security-headers')

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Content Security Policy - prevent XSS attacks
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com https://generativelanguage.googleapis.com;",

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // XSS protection (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy - don't leak referrer info
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // Remove server identification
  'X-Powered-By': '',

  // Cache busting for sensitive content
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

/**
 * Allowed CORS origins
 */
export function getAllowedCorsOrigins(): string[] {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS || ''
  if (!allowedOrigins) {
    securityLogger.warn('No CORS_ALLOWED_ORIGINS configured, defaulting to localhost')
    return ['http://localhost:3000', 'http://localhost:3001']
  }
  return allowedOrigins.split(',').map(origin => origin.trim())
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  const allowed = getAllowedCorsOrigins()
  return allowed.includes(origin)
}

/**
 * Set CORS headers
 */
export function setCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  if (!origin) {
    securityLogger.debug('No origin provided, skipping CORS headers')
    return response
  }

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, stripe-signature'
    )
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    securityLogger.debug('CORS headers set for allowed origin', { origin })
  } else {
    securityLogger.warn('Request from unauthorized origin', { origin })
  }

  return response
}

/**
 * Set security headers
 */
export function setSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })
  return response
}

/**
 * Handle CORS preflight requests (OPTIONS)
 */
export function handleCorsPreflights(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const response = new NextResponse(null, { status: 204 })

    setCorsHeaders(response, origin)

    securityLogger.debug('CORS preflight handled', { origin, method: request.method })
    return response
  }

  return null
}

/**
 * Middleware to apply CORS and security headers to all responses
 */
export function withSecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin')

  // Apply CORS headers
  setCorsHeaders(response, origin)

  // Apply security headers
  setSecurityHeaders(response)

  return response
}

/**
 * Middleware for route handlers
 * Usage: 
 *   export async function POST(request: NextRequest) {
 *     const response = await handleRequest(request)
 *     return withSecurityHeaders(request, response)
 *   }
 */
export async function applySecurityHeaders<T>(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  const response = await handler(request)
  const origin = request.headers.get('origin')

  setCorsHeaders(response, origin)
  setSecurityHeaders(response)

  return response
}
