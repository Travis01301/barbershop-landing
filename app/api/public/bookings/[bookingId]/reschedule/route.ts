import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

const log = logger.createChild('api.public.bookings.reschedule');
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json();
    const { token, newDate, barberId } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    // Get booking
    const bookingResult = await query(
      `SELECT pb.*, s.name as shop_name, s.phone, s.address
       FROM portal_bookings pb
       LEFT JOIN shops s ON pb.shop_id = s.id
       WHERE pb.id = $1 AND pb.booking_token = $2`,
      [bookingId, token]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Check token expiration
    if (new Date(booking.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // Validate new barber if provided
    const newBarberId = barberId || booking.barber_id;
    const barberResult = await query(
      'SELECT id, name FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
      [newBarberId, booking.shop_id, 'barber']
    );

    if (barberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Barber not found' },
        { status: 404 }
      );
    }

    // Check availability for new time
    const scheduleResult = await query(
      `SELECT * FROM barber_schedules
       WHERE barber_id = $1 AND shop_id = $2 AND is_active = true`,
      [newBarberId, booking.shop_id]
    );

    if (scheduleResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Barber not available' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const appointmentsResult = await query(
      `SELECT * FROM appointments
       WHERE barber_id = $1 AND DATE(start_time) = $2::DATE
       AND status != 'cancelled'`,
      [newBarberId, newDate]
    );

    // Simple conflict check (this should be more sophisticated in production)
    if (appointmentsResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Requested time is not available' },
        { status: 400 }
      );
    }

    // Update booking
    const updatedResult = await query(
      `UPDATE portal_bookings 
       SET scheduled_date = $1, barber_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newDate, newBarberId, bookingId]
    );

    const updatedBooking = updatedResult.rows[0];

    // Send confirmation email
    try {
      const scheduledTime = new Date(newDate);
      const dateStr = scheduledTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = scheduledTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      await resend.emails.send({
        from: 'noreply@barbershop.com',
        to: booking.customer_email,
        subject: `Appointment Rescheduled - ${booking.shop_name}`,
        html: `
          <h2>Appointment Rescheduled</h2>
          <p>Hi ${booking.customer_name},</p>
          <p>Your appointment has been rescheduled.</p>
          
          <h3>New Appointment Details:</h3>
          <ul>
            <li><strong>Date:</strong> ${dateStr}</li>
            <li><strong>Time:</strong> ${timeStr}</li>
            <li><strong>Barber:</strong> ${barberResult.rows[0].name}</li>
            <li><strong>Location:</strong> ${booking.address}</li>
          </ul>
          
          <p>Questions? Call us at ${booking.phone}</p>
        `,
      });
    } catch (error) {
      log.warn('Failed to send reschedule email', error);
    }

    log.info('Booking rescheduled', {
      bookingId: booking.id,
      oldDate: booking.scheduled_date,
      newDate,
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    log.error('Failed to reschedule booking', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reschedule booking' },
      { status: 500 }
    );
  }
}
