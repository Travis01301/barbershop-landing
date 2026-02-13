import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

/**
 * POST - Activate barber account with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
    }

    // Find onboarding record by activation token
    const onboardingResult = await query(
      `SELECT * FROM barber_onboarding 
       WHERE activation_token = $1 AND is_activated = false AND expires_at > NOW()`,
      [token]
    )

    if (onboardingResult.rows.length === 0) {
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

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully',
      token: jwtToken,
      shopId: shopId
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}

/**
 * GET - Check activation token validity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const result = await query(
      `SELECT email, is_activated, expires_at 
       FROM barber_onboarding 
       WHERE activation_token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ valid: false, message: 'Token not found' })
    }

    const onboarding = result.rows[0]

    if (onboarding.is_activated) {
      return NextResponse.json({ valid: false, message: 'Account already activated' })
    }

    if (new Date(onboarding.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: 'Activation link expired' })
    }

    return NextResponse.json({
      valid: true,
      email: onboarding.email,
      message: 'Token is valid'
    })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 })
  }
}
