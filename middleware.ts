import { NextRequest, NextResponse } from 'next/server'
import { withSecurityHeaders, handleCorsPreflights } from './lib/security-headers'
import { logger } from './lib/logger'

const middlewareLogger = logger.createChild('middleware')

/**
 * Middleware to apply security headers and CORS to all requests
 * Runs on every request to the API
 */
export function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  const preflightResponse = handleCorsPreflights(request)
  if (preflightResponse) {
    return preflightResponse
  }

  // Log request
  middlewareLogger.debug('Request received', {
    method: request.method,
    path: request.nextUrl.pathname,
    origin: request.headers.get('origin'),
  })

  // For preflight and regular requests, create a response with security headers
  let response = NextResponse.next()
  response = withSecurityHeaders(request, response)

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to all pages except static files
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
