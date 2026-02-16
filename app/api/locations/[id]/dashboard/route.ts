import { NextRequest, NextResponse } from 'next/server';
import multiLocationService from '@/lib/multi-location-service';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/locations/[id]/dashboard');

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shopId = parseInt(params.id);

    if (isNaN(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shop ID' },
        { status: 400 }
      );
    }

    // Get location info
    const locations = await multiLocationService.getLocations(shopId);
    if (locations.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const location = locations[0];

    // Get staff
    const staff = await multiLocationService.getLocationStaff(shopId);

    // Get today's appointments
    const today = new Date().toISOString().split('T')[0];
    const appointmentsResult = await query<any>(
      `
      SELECT 
        a.id,
        a.customer_name,
        a.start_time,
        a.end_time,
        u.name as barber_name,
        a.status
      FROM appointments a
      LEFT JOIN users u ON a.barber_id = u.id
      WHERE a.shop_id = $1
        AND DATE(a.start_time) = $2
      ORDER BY a.start_time
      `,
      [shopId, today]
    );

    // Get today's revenue
    const revenueResult = await query<any>(
      `
      SELECT 
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) as total_revenue,
        COUNT(DISTINCT a.id) as appointment_count
      FROM appointments a
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE a.shop_id = $1
        AND DATE(a.start_time) = $2
        AND a.status = 'completed'
      `,
      [shopId, today]
    );

    return NextResponse.json({
      location,
      staff,
      todayAppointments: appointmentsResult.rows,
      todayMetrics: {
        totalRevenue: parseFloat(revenueResult.rows[0]?.total_revenue || 0),
        appointmentCount: revenueResult.rows[0]?.appointment_count || 0,
      },
    });
  } catch (error) {
    log.error('Failed to get location dashboard', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get location dashboard' },
      { status: 500 }
    );
  }
}
