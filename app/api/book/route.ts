import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { BookingConfirmationEmail } from '@/lib/email-templates'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

function generateManagementToken(appointmentId: number, email: string): string {
  const data = `${appointmentId}:${email}:${process.env.TOKEN_SECRET || 'secret'}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopId, barberId, customerName, customerPhone, customerEmail, date, time, notes } = body

    // Combine date and time into timestamp
    const startTime = new Date(`${date} ${time}`)
    const endTime = new Date(startTime.getTime() + 30 * 60000) // 30 min appointment

    // First, find or create customer profile
    let customerId: number | null = null

    if (customerEmail) {
      // Check if customer profile already exists
      const existingCustomer = await pool.query(
        `SELECT id FROM customer_profiles WHERE shop_id = $1 AND email = $2`,
        [shopId, customerEmail]
      )

      if (existingCustomer.rows.length > 0) {
        customerId = existingCustomer.rows[0].id
      } else {
        // Create new customer profile
        const newCustomer = await pool.query(
          `INSERT INTO customer_profiles (shop_id, email, name, phone)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [shopId, customerEmail, customerName, customerPhone]
        )
        customerId = newCustomer.rows[0].id
      }
    }

    // Insert appointment with customer_id
    const result = await pool.query(
      `INSERT INTO appointments (shop_id, barber_id, customer_id, customer_name, customer_phone, customer_email, start_time, end_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [shopId, barberId, customerId, customerName, customerPhone, customerEmail, startTime, endTime, 'confirmed', notes]
    )

    const appointment = result.rows[0]
    const managementToken = generateManagementToken(appointment.id, customerEmail)

    // Get barber name for email
    const barberResult = await pool.query('SELECT name FROM barbers WHERE id = $1', [barberId])
    const barberName = barberResult.rows[0]?.name || 'Your Barber'

    // Get shop name for email
    const shopResult = await pool.query('SELECT name FROM shops WHERE id = $1', [shopId])
    const shopName = shopResult.rows[0]?.name || 'Barbershop'

    // Send booking confirmation email
    if (customerEmail) {
      const cancelLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/appointments/${appointment.id}?token=${managementToken}`
      
      const htmlContent = BookingConfirmationEmail({
        customerName: customerName,
        barberName: barberName,
        serviceDate: date,
        serviceTime: time,
        shopName: shopName,
        bookingId: appointment.id.toString(),
        cancelLink: cancelLink,
      })

      await sendEmail({
        shopId: shopId,
        to: customerEmail,
        subject: `Booking Confirmed - ${shopName} 💈`,
        htmlContent: htmlContent,
        emailType: 'booking_confirmation',
        relatedId: appointment.id,
      })
    }

    return NextResponse.json({
      success: true,
      appointment,
      managementToken,
      customer_id: customerId
    })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create booking'
    }, { status: 500 })
  }
}
