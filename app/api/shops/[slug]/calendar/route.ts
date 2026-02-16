import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'


export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = await params

    // Get shop by slug
    const shopResult = await query(
      'SELECT id, name FROM shops WHERE slug = $1',
      [slug]
    )

    if (shopResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shop = shopResult.rows[0]

    // Get all confirmed appointments for the next 90 days
    const appointmentsResult = await query(
      `SELECT a.*, u.name as barber_name
       FROM appointments a
       LEFT JOIN users u ON a.barber_id = u.id
       WHERE a.shop_id = $1
       AND a.status = 'confirmed'
       AND a.start_time >= NOW()
       AND a.start_time <= NOW() + INTERVAL '90 days'
       ORDER BY a.start_time ASC`,
      [shop.id]
    )

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const events = appointmentsResult.rows.map(apt => {
      const startDate = new Date(apt.start_time)
      const endDate = new Date(apt.end_time)

      return `BEGIN:VEVENT
UID:${apt.id}@barbershop-booking
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Appointment
DESCRIPTION:Barber: ${apt.barber_name || 'TBD'}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`
    }).join('\n')

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop Booking//${shop.name}//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${shop.name}
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Appointments at ${shop.name}
${events}
END:VCALENDAR`

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error generating shop calendar:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    )
  }
}
