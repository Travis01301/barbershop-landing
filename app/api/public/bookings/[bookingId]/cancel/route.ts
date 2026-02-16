import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';
import Stripe from 'stripe';

const log = logger.createChild('api.public.bookings.cancel');
const resend = new Resend(process.env.RESEND_API_KEY!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CANCELLATION_FEE_CENTS = 1500; // $15
const HOURS_BEFORE_CANCELLATION_FREE = 48;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json();
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    // Get booking
    const bookingResult = await query(
      `SELECT pb.*, s.name as shop_name, s.phone
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

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Booking already cancelled' },
        { status: 400 }
      );
    }

    // Check cancellation policy
    const hoursUntilAppointment =
      (new Date(booking.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60);
    const cancellationFeeApplied = hoursUntilAppointment < HOURS_BEFORE_CANCELLATION_FREE;

    let refundAmount = booking.total_amount_cents;
    if (cancellationFeeApplied) {
      refundAmount = Math.max(0, booking.total_amount_cents - CANCELLATION_FEE_CENTS);
    }

    // Process refund if payment was made
    if (booking.stripe_payment_intent_id && booking.payment_status === 'completed') {
      try {
        const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

        if (intent.charges.data.length > 0) {
          const chargeId = intent.charges.data[0].id;

          await stripe.refunds.create({
            charge: chargeId,
            amount: refundAmount,
            reason: 'requested_by_customer',
          });
        }
      } catch (error) {
        log.error('Failed to process refund', error);
      }
    }

    // Update booking
    const updatedResult = await query(
      `UPDATE portal_bookings 
       SET status = 'cancelled', cancel_reason = $1, cancelled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reason || null, bookingId]
    );

    const updatedBooking = updatedResult.rows[0];

    // Send cancellation email
    try {
      let emailContent = `
        <h2>Appointment Cancelled</h2>
        <p>Hi ${booking.customer_name},</p>
        <p>Your appointment at <strong>${booking.shop_name}</strong> has been cancelled.</p>
      `;

      if (cancellationFeeApplied) {
        emailContent += `
          <p>
            <strong>Cancellation Policy:</strong> Since your appointment was within 48 hours,
            a cancellation fee of $${(CANCELLATION_FEE_CENTS / 100).toFixed(2)} has been applied.
          </p>
          <p><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(2)}</p>
        `;
      } else {
        emailContent += `<p><strong>Refund Amount:</strong> $${(refundAmount / 100).toFixed(2)} (Full refund)</p>`;
      }

      emailContent += `<p>Questions? Call us at ${booking.shop_name}</p>`;

      await resend.emails.send({
        from: 'noreply@barbershop.com',
        to: booking.customer_email,
        subject: `Appointment Cancelled - ${booking.shop_name}`,
        html: emailContent,
      });
    } catch (error) {
      log.warn('Failed to send cancellation email', error);
    }

    log.info('Booking cancelled', {
      bookingId: booking.id,
      refundAmount,
      feeApplied: cancellationFeeApplied,
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      refundAmount: refundAmount / 100,
      cancellationFeeApplied,
    });
  } catch (error) {
    log.error('Failed to cancel booking', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
