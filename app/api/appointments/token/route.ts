import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import crypto from 'crypto'


// Generate a unique token for appointment management
function generateToken(appointmentId: number, email: string): string {
  const data = `${appointmentId}:${email}:${process.env.TOKEN_SECRET || 'secret'}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointmentId')
    const email = searchParams.get('email')

    if (!appointmentId || !email) {
      return NextResponse.json(
        { error: 'appointmentId and email required' },
        { status: 400 }
      )
    }

    const token = generateToken(parseInt(appointmentId), email)

    return NextResponse.json({ success: true, token })
  } catch (error) {
    console.error('Error generating token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
