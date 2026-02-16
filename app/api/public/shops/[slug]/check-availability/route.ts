import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { availabilityService } from '@/lib/availability-service';

const log = logger.createChild('api.public.check-availability');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { barberId, date, serviceId } = body;

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

    // Get barber's schedule for the date
    const scheduleResult = await query(
      `SELECT bs.*, ba.reason as unavailable_reason
       FROM barber_schedules bs
       LEFT JOIN barber_availability ba ON bs.barber_id = ba.barber_id 
         AND ba.date = $2
         AND ba.reason IS NOT NULL
       WHERE bs.barber_id = $1 AND bs.shop_id = $3 AND bs.is_active = true`,
      [barberId, date, shopId]
    );

    if (scheduleResult.rows.length === 0) {
      return NextResponse.json(
        { success: true, availableSlots: [] }
      );
    }

    const schedule = scheduleResult.rows[0];

    // Check for time off
    const timeOffResult = await query(
      `SELECT * FROM barber_time_off 
       WHERE barber_id = $1 AND $2::DATE BETWEEN start_date AND end_date 
       AND status = 'approved'`,
      [barberId, date]
    );

    if (timeOffResult.rows.length > 0) {
      return NextResponse.json(
        { success: true, availableSlots: [] }
      );
    }

    // Get service duration
    let serviceDuration = 30;
    if (serviceId) {
      const serviceResult = await query(
        'SELECT duration_minutes FROM barber_services WHERE id = $1',
        [serviceId]
      );
      if (serviceResult.rows.length > 0) {
        serviceDuration = serviceResult.rows[0].duration_minutes || 30;
      }
    }

    // Get existing appointments
    const appointmentsResult = await query(
      `SELECT start_time, end_time FROM appointments
       WHERE barber_id = $1 AND DATE(start_time) = $2::DATE 
       AND status != 'cancelled'`,
      [barberId, date]
    );

    // Generate available slots (15-minute intervals)
    const availableSlots: any[] = [];
    const startHour = new Date(`${date}T${schedule.start_time}`);
    const endHour = new Date(`${date}T${schedule.end_time}`);

    let currentTime = new Date(startHour);
    while (currentTime < endHour) {
      const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);

      // Check if slot overlaps with any existing appointment
      const isBooked = appointmentsResult.rows.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return currentTime < aptEnd && slotEnd > aptStart;
      });

      if (!isBooked && slotEnd <= endHour) {
        availableSlots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          display: currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        });
      }

      currentTime = new Date(currentTime.getTime() + 15 * 60000); // 15-minute intervals
    }

    log.info('Availability check completed', {
      barberId,
      date,
      availableSlots: availableSlots.length,
    });

    return NextResponse.json({
      success: true,
      availableSlots,
      serviceDuration,
    });
  } catch (error) {
    log.error('Availability check failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
