import { NextRequest, NextResponse } from 'next/server'
import { jwtAuth, JWTPayload } from './jwt-auth'
import { logger } from './logger'

const authLogger = logger.createChild('auth-middleware')

export interface AuthContext {
  user: JWTPayload
  isAuthenticated: boolean
}

/**
 * Verify request has valid JWT token
 * Throws if token is invalid or missing
 */
export async function verifyToken(request: NextRequest): Promise<JWTPayload> {
  const authHeader = request.headers.get('authorization')
  const token = jwtAuth.extractToken(authHeader)

  if (!token) {
    authLogger.warn('Missing authorization token')
    throw new Error('Missing authorization token')
  }

  try {
    const payload = await jwtAuth.verifyAccessToken(token)
    authLogger.debug('Token verified', { userId: payload.userId })
    return payload
  } catch (error) {
    authLogger.warn('Token verification failed', error)
    throw error
  }
}

/**
 * Middleware to protect routes requiring authentication
 * Returns 401 if token is invalid/missing
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const user = await verifyToken(request)
    return await handler(request, user)
  } catch (error) {
    authLogger.warn('Authentication required', error)
    return NextResponse.json(
      { error: 'Unauthorized - invalid or missing token' },
      { status: 401 }
    )
  }
}

/**
 * Middleware to check user role
 * Returns 403 if user doesn't have required role
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: JWTPayload['role'] | JWTPayload['role'][],
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const user = await verifyToken(request)

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(user.role)) {
      authLogger.warn('Insufficient permissions', {
        userId: user.userId,
        userRole: user.role,
        requiredRoles: roles,
      })
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      )
    }

    return await handler(request, user)
  } catch (error) {
    authLogger.warn('Authorization check failed', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * Middleware to check shop ownership
 * Prevents users from accessing other shops' data
 */
export async function requireShopAccess(
  request: NextRequest,
  requestedShopId: string,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const user = await verifyToken(request)

    // Admin can access any shop
    if (user.role === 'admin') {
      return await handler(request, user)
    }

    // Non-admin must have matching shopId
    if (user.shopId !== requestedShopId) {
      authLogger.warn('Shop access denied', {
        userId: user.userId,
        userShopId: user.shopId,
        requestedShopId,
      })
      return NextResponse.json(
        { error: 'Forbidden - no access to this shop' },
        { status: 403 }
      )
    }

    return await handler(request, user)
  } catch (error) {
    authLogger.warn('Shop access check failed', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

/**
 * Optional auth middleware
 * Doesn't fail if token is missing, but includes user if present
 */
export async function optionalAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: JWTPayload | null) => Promise<NextResponse>
): Promise<NextResponse> {
  let user: JWTPayload | null = null

  try {
    user = await verifyToken(request)
  } catch {
    // Token missing or invalid - continue with null user
  }

  return await handler(request, user)
}
