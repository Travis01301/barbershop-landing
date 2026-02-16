import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api.public.barbers');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    // Validate shop exists and is portal-enabled
    const shopResult = await query(
      'SELECT id FROM shops WHERE portal_slug = $1 AND portal_enabled = true',
      [slug]
    );

    if (shopResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shop not found or portal not enabled' },
        { status: 404 }
      );
    }

    const shopId = shopResult.rows[0].id;

    // Get barbers
    let query_sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.bio,
        u.profile_photo_url,
        u.specialties,
        u.average_rating,
        u.review_count,
        COUNT(DISTINCT bs.day_of_week) as scheduled_days
      FROM users u
      LEFT JOIN barber_schedules bs ON u.id = bs.barber_id AND bs.shop_id = $1 AND bs.is_active = true
      WHERE u.shop_id = $1 AND u.role = 'barber' AND u.is_active = true
      GROUP BY u.id
      ORDER BY u.name ASC
    `;

    const barbersResult = await query(query_sql, [shopId]);

    // Get services for each barber if filtered
    const barbers = await Promise.all(
      barbersResult.rows.map(async (barber) => {
        let services: any[] = [];

        if (serviceId) {
          // Check if barber offers this specific service
          const serviceResult = await query(
            `SELECT bs.id, bs.name, bs.price_cents, bs.duration_minutes
             FROM barber_services bs
             LEFT JOIN barber_specialties bsp ON bs.id = bsp.service_id AND bsp.barber_id = $1
             WHERE bs.id = $2 AND bs.shop_id = $3
             AND (bsp.id IS NOT NULL OR bs.id IN (
               SELECT service_id FROM barber_specialties WHERE barber_id = $1
             ))`,
            [barber.id, serviceId, shopId]
          );
          services = serviceResult.rows;
        } else {
          // Get all services
          const servicesResult = await query(
            `SELECT DISTINCT bs.id, bs.name, bs.price_cents, bs.duration_minutes
             FROM barber_services bs
             LEFT JOIN barber_specialties bsp ON bs.id = bsp.service_id AND bsp.barber_id = $1
             WHERE bs.shop_id = $2
             AND (bsp.id IS NOT NULL OR bs.id IN (
               SELECT service_id FROM barber_specialties WHERE barber_id = $1
             ))
             ORDER BY bs.name`,
            [barber.id, shopId]
          );
          services = servicesResult.rows;
        }

        // Get upcoming availability
        const availabilityResult = await query(
          `SELECT DISTINCT DATE(bs.start_time) as available_date
           FROM barber_schedules bs
           WHERE bs.barber_id = $1 AND bs.shop_id = $2 AND bs.is_active = true
           AND DATE(bs.start_time) >= CURRENT_DATE
           AND DATE(bs.start_time) <= CURRENT_DATE + INTERVAL '30 days'
           LIMIT 5`,
          [barber.id, shopId]
        );

        return {
          ...barber,
          services,
          upcomingAvailability: availabilityResult.rows.map(r => r.available_date),
        };
      })
    );

    log.info('Barbers list retrieved', {
      shopId,
      count: barbers.length,
    });

    return NextResponse.json({
      success: true,
      barbers,
    });
  } catch (error) {
    log.error('Failed to get barbers', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get barbers' },
      { status: 500 }
    );
  }
}
