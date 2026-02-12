import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { SignupConfirmationEmail } from '@/lib/email-templates'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopName, ownerName, email, phone } = body

    // Validate input
    if (!shopName || !ownerName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create signup record
    const signupResult = await pool.query(
      'INSERT INTO signups (shop_name, owner_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [shopName, ownerName, email, phone]
    )

    const signupId = signupResult.rows[0].id

    // Generate activation token
    const activationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create dummy shop for onboarding (will be replaced after verification)
    const shopResult = await pool.query(
      'INSERT INTO shops (name, slug, owner_email) VALUES ($1, $2, $3) RETURNING id',
      [shopName, shopName.toLowerCase().replace(/\s+/g, '-'), email]
    )
    const shopId = shopResult.rows[0].id

    // Create barber onboarding record
    await pool.query(
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

    return NextResponse.json({
      success: true,
      signup: signupResult.rows[0],
      emailSent: emailResult.success,
      message: emailResult.success ? 'Verification email sent' : 'Signup saved (email failed)'
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process signup' },
      { status: 500 }
    )
  }
}
