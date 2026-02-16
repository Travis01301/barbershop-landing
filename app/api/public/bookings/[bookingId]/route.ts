import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api.public.bookings.get');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    // Get booking using token
    const bookingResult = await query(
      `SELECT 
        pb.*, 
        u.name as barber_name,
        bs.name as service_name,
        bs.price_cents,
        s.name as shop_name,
        s.address,
        s.phone
      FROM portal_bookings pb
      LEFT JOIN users u ON pb.barber_id = u.id
      LEFT JOIN barber_services bs ON pb.service_id = bs.id
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

    // Get reviews if completed
    const reviewsResult = await query(
      `SELECT rating, comment, service_quality_rating, cleanliness_rating, communication_rating
       FROM portal_booking_reviews
       WHERE portal_booking_id = $1 AND is_published = true`,
      [booking.id]
    );

    log.info('Booking retrieved', {
      bookingId: booking.id,
      shopId: booking.shop_id,
    });

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        price: booking.price_cents / 100,
        depositAmount: booking.deposit_amount_cents / 100,
        totalAmount: booking.total_amount_cents / 100,
        reviews: reviewsResult.rows,
      },
    });
  } catch (error) {
    log.error('Failed to get booking', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get booking' },
      { status: 500 }
    );
  }
}
