import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import crypto from 'crypto'


function generateToken(appointmentId: number, email: string): string {
  const data = `${appointmentId}:${email}:${process.env.TOKEN_SECRET || 'secret'}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 })
    }

    // Get appointment
    const appointmentResult = await query(
      `SELECT a.*, u.name as barber_name, s.name as shop_name
       FROM appointments a
       JOIN shops s ON a.shop_id = s.id
       LEFT JOIN users u ON a.barber_id = u.id
       WHERE a.id = $1`,
      [id]
    )

    if (appointmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const apt = appointmentResult.rows[0]

    // Validate token
    const expectedToken = generateToken(apt.id, apt.customer_email)
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({ success: true, appointment: apt })
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
  }
}
