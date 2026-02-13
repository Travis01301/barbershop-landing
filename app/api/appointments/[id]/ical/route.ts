import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch appointment details
    const appointmentResult = await query(
      `SELECT a.*, s.name as shop_name, u.name as barber_name
       FROM appointments a
       JOIN shops s ON a.shop_id = s.id
       LEFT JOIN users u ON a.barber_id = u.id
       WHERE a.id = $1`,
      [id]
    )

    if (appointmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const apt = appointmentResult.rows[0]
    const startDate = new Date(apt.start_time)
    const endDate = new Date(apt.end_time)

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${apt.shop_name}
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
UID:${apt.id}@barbershop-booking
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Appointment at ${apt.shop_name}
DESCRIPTION:Barber: ${apt.barber_name || 'TBD'}\\nCustomer: ${apt.customer_name}${apt.notes ? '\\nNotes: ' + apt.notes.replace(/\n/g, '\\n') : ''}
LOCATION:${apt.shop_name}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="appointment-${apt.id}.ics"`,
      },
    })
  } catch (error) {
    console.error('Error generating iCal:', error)
    return NextResponse.json(
      { error: 'Failed to generate iCal file' },
      { status: 500 }
    )
  }
}
