import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'
import { SignupConfirmationEmail } from '@/lib/email-templates'
import { SignupSchema, validateInput } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.signup.POST')
  
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(SignupSchema, body, 'signup')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { shopName, ownerName, email, phone } = validation.data!
    routeLogger.debug('Processing signup', { email, shopName })

    // Create signup record
    const signupResult = await query(
      'INSERT INTO signups (shop_name, owner_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [shopName, ownerName, email, phone]
    )

    const signupId = signupResult.rows[0].id

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create dummy shop for onboarding (will be replaced after verification)
    const shopResult = await query(
      'INSERT INTO shops (name, slug, owner_email) VALUES ($1, $2, $3) RETURNING id',
      [shopName, shopName.toLowerCase().replace(/\s+/g, '-'), email]
    )
    const shopId = shopResult.rows[0].id

    // Create barber onboarding record
    await query(
      `INSERT INTO barber_onboarding (shop_id, activation_token, email, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [shopId, activationToken, email, expiresAt]
    )

    // Send activation email
    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/activate?token=${activationToken}`

    const htmlContent = SignupConfirmationEmail({
      barberName: ownerName,
      shopName: shopName,
      activationLink: activationLink,
      expiresIn: '7 days',
    })

    const emailResult = await sendEmail({
      shopId: shopId,
      to: email,
      subject: `Welcome to Barbershop - Activate Your Account 💈`,
      htmlContent: htmlContent,
      emailType: 'signup',
      relatedId: signupId,
    })

    routeLogger.info('Signup processed', { signupId, shopId, email, emailSent: emailResult.success })
    return NextResponse.json({
      success: true,
      signup: signupResult.rows[0],
      emailSent: emailResult.success,
      message: emailResult.success ? 'Verification email sent' : 'Signup saved (email failed)'
    })
  } catch (error) {
    routeLogger.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process signup' },
      { status: 500 }
    )
  }
}
