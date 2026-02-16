import { jwtVerify, SignJWT } from 'jose'
import { logger } from './logger'

const jwtLogger = logger.createChild('jwt-auth')

export interface JWTPayload {
  userId: string
  email: string
  role: 'customer' | 'barber' | 'admin'
  shopId?: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * JWT Auth Service
 * Handles token generation, validation, and refresh
 */
class JWTAuthService {
  private accessTokenSecret: string
  private refreshTokenSecret: string
  private accessTokenExpiresIn = '15m' // 15 minutes
  private refreshTokenExpiresIn = '7d' // 7 days

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'dev_secret_key_change_in_production'
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production'

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        jwtLogger.error('JWT secrets not configured in production!')
      }
    }
  }

  /**
   * Generate access token
   */
  async generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    try {
      const secret = new TextEncoder().encode(this.accessTokenSecret)
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime(this.accessTokenExpiresIn)
        .sign(secret)

      jwtLogger.debug('Access token generated', { userId: payload.userId, role: payload.role })
      return token
    } catch (error) {
      jwtLogger.error('Error generating access token', error)
      throw error
    }
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    try {
      const secret = new TextEncoder().encode(this.refreshTokenSecret)
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime(this.refreshTokenExpiresIn)
        .sign(secret)

      jwtLogger.debug('Refresh token generated', { userId: payload.userId })
      return token
    } catch (error) {
      jwtLogger.error('Error generating refresh token', error)
      throw error
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ])

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const secret = new TextEncoder().encode(this.accessTokenSecret)
      const verified = await jwtVerify(token, secret)
      return verified.payload as JWTPayload
    } catch (error) {
      jwtLogger.debug('Access token verification failed', { error: (error as Error).message })
      throw new Error('Invalid or expired access token')
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const secret = new TextEncoder().encode(this.refreshTokenSecret)
      const verified = await jwtVerify(token, secret)
      return verified.payload as JWTPayload
    } catch (error) {
      jwtLogger.debug('Refresh token verification failed', { error: (error as Error).message })
      throw new Error('Invalid or expired refresh token')
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken)
      const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        shopId: payload.shopId,
      }
      return this.generateTokenPair(newPayload)
    } catch (error) {
      jwtLogger.warn('Token refresh failed', error)
      throw error
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader: string | null): string | null {
    if (!authHeader) return null
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) return null
    return parts[1]
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(payload: JWTPayload): boolean {
    if (!payload.exp) return false
    return Date.now() / 1000 > payload.exp
  }

  /**
   * Get token expiration time in seconds
   */
  getTimeUntilExpiry(payload: JWTPayload): number {
    if (!payload.exp) return 0
    return Math.max(0, payload.exp - Date.now() / 1000)
  }
}

export const jwtAuth = new JWTAuthService()

export default jwtAuth
