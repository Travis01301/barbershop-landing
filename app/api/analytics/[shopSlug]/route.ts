import { Pool } from 'pg'
import { NextRequest } from 'next/server'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  try {
    const { shopSlug } = await params
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days') || '30'
    const days = parseInt(daysParam)

    const client = await pool.connect()

    try {
      // Get shop ID from slug
      const shopRes = await client.query(
        'SELECT id FROM barber_shops WHERE slug = $1',
        [shopSlug]
      )

      if (shopRes.rows.length === 0) {
        return Response.json({ error: 'Shop not found' }, { status: 404 })
      }

      const shopId = shopRes.rows[0].id

      // Get date range
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

      // 1. Total metrics
      const metricsRes = await client.query(
        `
        SELECT 
          COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END) as total_bookings,
          COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END) as cancelled_bookings,
          COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_bookings,
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0)::bigint as total_revenue,
          COALESCE(AVG(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE NULL END), 0)::int as avg_payment,
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN (SELECT COALESCE(SUM(p2.amount - p2.amount * 100 / (SELECT amount FROM payments p3 WHERE p3.id = p2.id LIMIT 1)), 0) FROM payments p2 WHERE p2.customer_email LIKE '%tip%' LIMIT 0) ELSE 0 END), 0)::int as total_tips
        FROM appointments a
        LEFT JOIN payments p ON a.id = p.appointment_id
        WHERE a.shop_id = $1 AND a.created_at >= $2
        `,
        [shopId, startDate]
      )

      const { 
        total_bookings = 0, 
        cancelled_bookings = 0, 
        completed_bookings = 0, 
        total_revenue = 0,
        avg_payment = 0,
        total_tips = 0 
      } = metricsRes.rows[0] || {}

      // 2. Booking trend by day (last 30 days)
      const trendRes = await client.query(
        `
        SELECT 
          DATE(a.created_at) as date,
          COUNT(*) as bookings,
          COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancellations
        FROM appointments a
        WHERE a.shop_id = $1 AND a.created_at >= $2
        GROUP BY DATE(a.created_at)
        ORDER BY date ASC
        `,
        [shopId, startDate]
      )

      // 3. Revenue breakdown (deposits vs tips)
      const revenueBreakdownRes = await client.query(
        `
        SELECT 
          SUM(CASE WHEN a.total_paid > a.amount_cents THEN a.amount_cents ELSE a.total_paid END) as deposits,
          SUM(CASE WHEN a.total_paid > a.amount_cents THEN a.total_paid - a.amount_cents ELSE 0 END) as tips
        FROM appointments a
        WHERE a.shop_id = $1 AND a.payment_required = true AND a.deposit_paid = true AND a.created_at >= $2
        `,
        [shopId, startDate]
      )

      const { deposits = 0, tips = 0 } = revenueBreakdownRes.rows[0] || {}

      // 4. Payment method breakdown
      const paymentMethodRes = await client.query(
        `
        SELECT 
          p.payment_method,
          COUNT(*) as count,
          SUM(p.amount) as total
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        WHERE a.shop_id = $1 AND p.status = 'succeeded' AND p.created_at >= $2
        GROUP BY p.payment_method
        `,
        [shopId, startDate]
      )

      // 5. Barber performance
      const barberPerformanceRes = await client.query(
        `
        SELECT 
          b.id,
          b.name,
          COUNT(a.id) as total_bookings,
          COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_bookings,
          COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0)::bigint as revenue
        FROM barbers b
        LEFT JOIN appointments a ON b.id = a.barber_id AND a.shop_id = $1 AND a.created_at >= $2
        LEFT JOIN payments p ON a.id = p.appointment_id
        WHERE b.shop_id = $1
        GROUP BY b.id, b.name
        ORDER BY total_bookings DESC
        `,
        [shopId, startDate]
      )

      // 6. Peak hours analysis
      const peakHoursRes = await client.query(
        `
        SELECT 
          EXTRACT(HOUR FROM a.start_time) as hour,
          COUNT(*) as bookings
        FROM appointments a
        WHERE a.shop_id = $1 AND a.status IN ('confirmed', 'completed') AND a.created_at >= $2
        GROUP BY EXTRACT(HOUR FROM a.start_time)
        ORDER BY hour ASC
        `,
        [shopId, startDate]
      )

      // 7. Peak days of week
      const peakDaysRes = await client.query(
        `
        SELECT 
          EXTRACT(DOW FROM a.start_time)::int as day_of_week,
          TO_CHAR(a.start_time, 'Day') as day_name,
          COUNT(*) as bookings
        FROM appointments a
        WHERE a.shop_id = $1 AND a.status IN ('confirmed', 'completed') AND a.created_at >= $2
        GROUP BY EXTRACT(DOW FROM a.start_time), TO_CHAR(a.start_time, 'Day')
        ORDER BY day_of_week ASC
        `,
        [shopId, startDate]
      )

      // 8. Top customers
      const topCustomersRes = await client.query(
        `
        SELECT 
          c.email,
          c.name,
          COUNT(a.id) as bookings,
          MAX(a.created_at) as last_booking
        FROM customers c
        LEFT JOIN appointments a ON c.id = a.customer_id AND a.shop_id = $1 AND a.created_at >= $2
        WHERE c.shop_id = $1
        GROUP BY c.id, c.email, c.name
        HAVING COUNT(a.id) > 0
        ORDER BY bookings DESC
        LIMIT 10
        `,
        [shopId, startDate]
      )

      // Calculate cancellation rate
      const totalAppointments = total_bookings + cancelled_bookings
      const cancellationRate = totalAppointments > 0 
        ? Math.round((cancelled_bookings / totalAppointments) * 100) 
        : 0

      return Response.json({
        success: true,
        summary: {
          totalBookings: parseInt(total_bookings),
          completedBookings: parseInt(completed_bookings),
          cancelledBookings: parseInt(cancelled_bookings),
          cancellationRate,
          totalRevenue: parseInt(total_revenue),
          totalTips: parseInt(total_tips),
          averagePayment: parseInt(avg_payment),
        },
        trend: trendRes.rows.map(row => ({
          date: new Date(row.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          bookings: row.bookings,
          cancellations: row.cancellations,
        })),
        revenueBreakdown: {
          deposits: parseInt(deposits),
          tips: parseInt(tips),
        },
        paymentMethods: paymentMethodRes.rows.map(row => ({
          method: row.payment_method || 'card',
          count: row.count,
          total: parseInt(row.total),
        })),
        barberPerformance: barberPerformanceRes.rows.map(row => ({
          id: row.id,
          name: row.name,
          totalBookings: row.total_bookings,
          completedBookings: row.completed_bookings,
          revenue: parseInt(row.revenue),
        })),
        peakHours: peakHoursRes.rows.map(row => ({
          hour: `${Math.floor(row.hour)}:00`,
          bookings: row.bookings,
        })),
        peakDays: peakDaysRes.rows.map(row => ({
          day: row.day_name.trim(),
          dayOfWeek: row.day_of_week,
          bookings: row.bookings,
        })),
        topCustomers: topCustomersRes.rows.map(row => ({
          name: row.name,
          email: row.email,
          bookings: row.bookings,
          lastBooking: row.last_booking,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Analytics error:', error)
    return Response.json(
      { error: 'Failed to fetch analytics', details: (error as Error).message },
      { status: 500 }
    )
  }
}
