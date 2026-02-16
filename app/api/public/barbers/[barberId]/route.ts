import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api.public.barbers.profile');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barberId: string }> }
) {
  try {
    const { barberId } = await params;

    // Get barber profile
    const barberResult = await query(
      `SELECT 
        id, name, email, bio, profile_photo_url,
        specialties, average_rating, review_count
      FROM users
      WHERE id = $1 AND role = 'barber' AND is_active = true`,
      [parseInt(barberId)]
    );

    if (barberResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Barber not found' },
        { status: 404 }
      );
    }

    const barber = barberResult.rows[0];

    // Get reviews
    const reviewsResult = await query(
      `SELECT 
        pbr.id, pbr.rating, pbr.comment, pbr.created_at,
        pbr.service_quality_rating, pbr.cleanliness_rating,
        pbr.communication_rating, pb.customer_name
      FROM portal_booking_reviews pbr
      LEFT JOIN portal_bookings pb ON pbr.portal_booking_id = pb.id
      WHERE pbr.barber_id = $1 AND pbr.is_published = true
      ORDER BY pbr.created_at DESC
      LIMIT 10`,
      [parseInt(barberId)]
    );

    // Get upcoming availability
    const availabilityResult = await query(
      `SELECT DISTINCT DATE(start_time)::TEXT as available_date
       FROM barber_schedules
       WHERE barber_id = $1 AND is_active = true
       AND DATE(start_time) >= CURRENT_DATE
       AND DATE(start_time) <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY DATE(start_time)`,
      [parseInt(barberId)]
    );

    // Get services
    const servicesResult = await query(
      `SELECT DISTINCT bs.id, bs.name, bs.price_cents, bs.duration_minutes
       FROM barber_services bs
       WHERE bs.id IN (
         SELECT service_id FROM barber_specialties WHERE barber_id = $1
       )
       ORDER BY bs.name`,
      [parseInt(barberId)]
    );

    log.info('Barber profile retrieved', {
      barberId,
    });

    return NextResponse.json({
      success: true,
      barber: {
        ...barber,
        reviews: reviewsResult.rows,
        upcomingAvailability: availabilityResult.rows.map(r => r.available_date),
        services: servicesResult.rows.map(s => ({
          ...s,
          price: s.price_cents / 100,
        })),
      },
    });
  } catch (error) {
    log.error('Failed to get barber profile', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get barber profile' },
      { status: 500 }
    );
  }
}
