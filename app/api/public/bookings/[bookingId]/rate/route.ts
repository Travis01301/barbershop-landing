import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api.public.bookings.rate');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json();
    const {
      token,
      rating,
      comment,
      serviceQualityRating,
      cleanlinessRating,
      communicationRating,
    } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get booking
    const bookingResult = await query(
      'SELECT * FROM portal_bookings WHERE id = $1 AND booking_token = $2',
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

    // Check if already reviewed
    const existingReview = await query(
      'SELECT id FROM portal_booking_reviews WHERE portal_booking_id = $1',
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Booking already reviewed' },
        { status: 400 }
      );
    }

    // Create review
    const reviewResult = await query(
      `INSERT INTO portal_booking_reviews (
        portal_booking_id, shop_id, barber_id,
        rating, comment, service_quality_rating,
        cleanliness_rating, communication_rating,
        is_verified_purchase, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
      RETURNING *`,
      [
        bookingId,
        booking.shop_id,
        booking.barber_id,
        rating,
        comment || null,
        serviceQualityRating || null,
        cleanlinessRating || null,
        communicationRating || null,
      ]
    );

    const review = reviewResult.rows[0];

    // Update barber's average rating
    if (booking.barber_id) {
      const barberReviewsResult = await query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as count
         FROM portal_booking_reviews
         WHERE barber_id = $1 AND is_published = true`,
        [booking.barber_id]
      );

      const barberStats = barberReviewsResult.rows[0];
      if (barberStats && barberStats.avg_rating) {
        await query(
          `UPDATE users 
           SET average_rating = $1, review_count = $2
           WHERE id = $3`,
          [
            Math.round(parseFloat(barberStats.avg_rating) * 100) / 100,
            parseInt(barberStats.count),
            booking.barber_id,
          ]
        );
      }
    }

    log.info('Review created', {
      bookingId: booking.id,
      barberId: booking.barber_id,
      rating,
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    log.error('Failed to create review', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
