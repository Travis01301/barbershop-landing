import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { LoginSchema, validateInput } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.login.POST')
  
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(LoginSchema, body, 'login')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { email, password } = validation.data!
    routeLogger.debug('Login attempt', { email })

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      routeLogger.warn('Login failed - user not found', { email })
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    const user = result.rows[0]

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!validPassword) {
      routeLogger.warn('Login failed - invalid password', { email })
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        shopId: user.shop_id,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    routeLogger.info('Login successful', { userId: user.id, email, shopId: user.shop_id })
    return NextResponse.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shop_id
      }
    })
  } catch (error) {
    routeLogger.error('Login error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Login failed' 
    }, { status: 500 })
  }
}
