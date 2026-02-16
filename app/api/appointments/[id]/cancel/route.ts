import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { cancellationService } from '@/lib/cancellation-service'
import { emailService } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const cancelLogger = logger.createChild('api.appointments.cancel')

// Validation schema for cancellation requests
const CancelRequestSchema = z.object({
  reason: z.string().optional(),
  token: z.string().optional(), // For public cancellations
  shopId: z.number().optional(), // For authenticated requests
})

type CancelRequest = z.infer<typeof CancelRequestSchema>

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    let body: CancelRequest = {}

    try {
      body = await request.json()
    } catch {
      // If body is not JSON, continue with empty body
    }

    // Validate request body
    const validationResult = CancelRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { reason } = validationResult.data

    // Get appointment details
    const aptResult = await query(
      `SELECT 
        a.id, a.shop_id, a.status, a.customer_name, 
        a.customer_email, a.start_time, a.customer_phone, b.name as barber_name
       FROM appointments a
       LEFT JOIN users b ON a.barber_id = b.id
       WHERE a.id = $1`,
      [id]
    )

    if (aptResult.rows.length === 0) {
      cancelLogger.warn('Appointment not found', { appointmentId: id })
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const appointment = aptResult.rows[0]
    const shopId = appointment.shop_id

    // Process cancellation
    const cancellationResult = await cancellationService.cancelAppointment(
      id,
      shopId,
      reason,
      'customer'
    )

    if (!cancellationResult.success) {
      cancelLogger.warn('Cancellation validation failed', {
        appointmentId: id,
        error: cancellationResult.error,
      })
      return NextResponse.json(
        {
          error: cancellationResult.error || 'Cannot cancel appointment',
          message: cancellationResult.message,
        },
        { status: 400 }
      )
    }

    // Send cancellation email
    const formattedDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const formattedTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Get shop details for email
    const shopResult = await query(
      `SELECT name FROM shops WHERE id = $1`,
      [shopId]
    )
    const shopName = shopResult.rows[0]?.name || 'Barbershop'

    try {
      await emailService.sendCancellationConfirmation({
        customerName: appointment.customer_name,
        customerEmail: appointment.customer_email,
        barberName: appointment.barber_name || 'Your barber',
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        cancellationReason: reason,
        shopName,
      })
    } catch (emailError) {
      cancelLogger.error('Error sending cancellation email', emailError, {
        appointmentId: id,
      })
      // Don't fail the cancellation if email fails
    }

    cancelLogger.info('Appointment cancelled successfully', {
      appointmentId: id,
      shopId,
      fee: cancellationResult.fee,
      hoursBefore: cancellationResult.hoursBefore,
    })

    return NextResponse.json({
      success: true,
      message: cancellationResult.message,
      appointment: {
        id: appointment.id,
        status: 'cancelled',
        cancellationFee: cancellationResult.fee,
        hoursBefore: cancellationResult.hoursBefore,
      },
    })
  } catch (error) {
    cancelLogger.error('Error processing cancellation', error)
    return NextResponse.json(
      { error: 'Failed to process cancellation' },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for public cancellations with token verification
 * This allows customers to cancel via email links without authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { token, reason } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Cancellation token required' },
        { status: 400 }
      )
    }

    // Get appointment
    const aptResult = await query(
      `SELECT * FROM appointments WHERE id = $1`,
      [id]
    )

    if (aptResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const appointment = aptResult.rows[0]

    // Verify token (simple SHA256 hash for now)
    // In production, use a more secure token mechanism
    const crypto = require('crypto')
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${appointment.id}:${appointment.customer_email}:${process.env.TOKEN_SECRET || 'secret'}`)
      .digest('hex')

    if (token !== expectedToken) {
      cancelLogger.warn('Invalid cancellation token', { appointmentId: id })
      return NextResponse.json(
        { error: 'Invalid cancellation token' },
        { status: 401 }
      )
    }

    // Use PATCH to process the cancellation
    const patchRequest = new NextRequest(request.url, {
      method: 'PATCH',
      headers: request.headers,
      body: JSON.stringify({ reason }),
    })

    return PATCH(patchRequest, { params })
  } catch (error) {
    cancelLogger.error('Error processing token-based cancellation', error)
    return NextResponse.json(
      { error: 'Failed to process cancellation' },
      { status: 500 }
    )
  }
}
