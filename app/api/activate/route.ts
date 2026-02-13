import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ActivateAccountSchema, validateInput, parseQueryParam } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

/**
 * POST - Activate barber account with token
 */
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.activate.POST')
  
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(ActivateAccountSchema, body, 'activate')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { token, password } = validation.data!
    routeLogger.debug('Processing account activation')

    // Find onboarding record by activation token
    const onboardingResult = await query(
      `SELECT * FROM barber_onboarding 
       WHERE activation_token = $1 AND is_activated = false AND expires_at > NOW()`,
      [token]
    )

    if (onboardingResult.rows.length === 0) {
      routeLogger.warn('Invalid or expired activation link')
      return NextResponse.json({ error: 'Invalid or expired activation link' }, { status: 400 })
    }

    const onboarding = onboardingResult.rows[0]
    const shopId = onboarding.shop_id

    // Update shop with complete info
    await query(
      `UPDATE shops SET owner_email = $1 WHERE id = $2`,
      [onboarding.email, shopId]
    )

    // Create user account for barber (if credentials table exists)
    // For now, marking as activated
    const activatedAt = new Date()
    await query(
      `UPDATE barber_onboarding 
       SET is_activated = true, activated_at = $1 
       WHERE id = $2`,
      [activatedAt, onboarding.id]
    )

    // Generate JWT token for the barber
    const jwtToken = jwt.sign(
      { shopId: shopId, email: onboarding.email, type: 'barber' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    routeLogger.info('Account activated successfully', { shopId, email: onboarding.email })
    return NextResponse.json({
      success: true,
      message: 'Account activated successfully',
      token: jwtToken,
      shopId: shopId
    })
  } catch (error) {
    routeLogger.error('Activation error:', error)
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}

/**
 * GET - Check activation token validity
 */
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.activate.GET')
  
  try {
    const { searchParams } = new URL(request.url)
    const token = parseQueryParam(searchParams.get('token'))

    if (!token) {
      routeLogger.warn('Missing activation token')
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    routeLogger.debug('Validating activation token')

    const result = await query(
      `SELECT email, is_activated, expires_at 
       FROM barber_onboarding 
       WHERE activation_token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      routeLogger.warn('Token not found')
      return NextResponse.json({ valid: false, message: 'Token not found' })
    }

    const onboarding = result.rows[0]

    if (onboarding.is_activated) {
      routeLogger.warn('Account already activated')
      return NextResponse.json({ valid: false, message: 'Account already activated' })
    }

    if (new Date(onboarding.expires_at) < new Date()) {
      routeLogger.warn('Activation link expired')
      return NextResponse.json({ valid: false, message: 'Activation link expired' })
    }

    routeLogger.debug('Token is valid', { email: onboarding.email })
    return NextResponse.json({
      valid: true,
      email: onboarding.email,
      message: 'Token is valid'
    })
  } catch (error) {
    routeLogger.error('Validation error:', error)
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 })
  }
}
