import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

const JWT_SECRET = 'your-secret-key-change-this-in-production'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    const user = result.rows[0]

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!validPassword) {
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
    console.error('Login error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Login failed' 
    }, { status: 500 })
  }
}
