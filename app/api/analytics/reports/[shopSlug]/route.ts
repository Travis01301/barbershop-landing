import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

const JWT_SECRET = 'your-secret-key-change-this-in-production'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  try {
    const { shopSlug } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    jwt.verify(token, JWT_SECRET)
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'revenue'
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Get shop ID from slug
    const shopResult = await pool.query(
      'SELECT id FROM shops WHERE slug = $1',
      [shopSlug]
    )
    if (shopResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    const shopId = shopResult.rows[0].id

    if (reportType === 'revenue') {
      return getRevenueReport(shopId, startDate)
    } else if (reportType === 'tax') {
      return getTaxReport(shopId, startDate)
    } else if (reportType === 'customer') {
      return getCustomerReport(shopId, startDate)
    } else if (reportType === 'payment') {
      return getPaymentReport(shopId, startDate)
    } else if (reportType === 'cancellation') {
      return getCancellationReport(shopId, startDate)
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

async function getRevenueReport(shopId: number, startDate: Date) {
  // Daily revenue breakdown
  const dailyRevenue = await pool.query(`
    SELECT 
      DATE(p.created_at) as date,
      COUNT(*) as total_transactions,
      COALESCE(SUM(p.amount), 0)::float as deposits,
      COALESCE(SUM(p.tip_amount), 0)::float as tips,
      COALESCE(SUM(p.amount) + SUM(p.tip_amount), 0)::float as total_revenue
    FROM payments p
    WHERE p.shop_id = $1 AND p.status = 'succeeded' AND p.created_at >= $2
    GROUP BY DATE(p.created_at)
    ORDER BY date DESC
  `, [shopId, startDate])

  // Monthly revenue
  const monthlyRevenue = await pool.query(`
    SELECT 
      DATE_TRUNC('month', p.created_at) as month,
      COALESCE(SUM(p.amount), 0)::float as deposits,
      COALESCE(SUM(p.tip_amount), 0)::float as tips,
      COALESCE(SUM(p.amount) + SUM(p.tip_amount), 0)::float as total_revenue,
      COUNT(*) as total_transactions
    FROM payments p
    WHERE p.shop_id = $1 AND p.status = 'succeeded' AND p.created_at >= $2
    GROUP BY DATE_TRUNC('month', p.created_at)
    ORDER BY month DESC
  `, [shopId, startDate])

  // Summary totals
  const totals = await pool.query(`
    SELECT 
      COALESCE(SUM(p.amount), 0)::float as total_deposits,
      COALESCE(SUM(p.tip_amount), 0)::float as total_tips,
      COALESCE(SUM(p.amount) + SUM(p.tip_amount), 0)::float as total_revenue,
      COUNT(*) as total_transactions,
      COUNT(DISTINCT p.customer_id) as unique_customers
    FROM payments p
    WHERE p.shop_id = $1 AND p.status = 'succeeded' AND p.created_at >= $2
  `, [shopId, startDate])

  return NextResponse.json({
    success: true,
    reportType: 'revenue',
    daily: dailyRevenue.rows,
    monthly: monthlyRevenue.rows,
    summary: totals.rows[0],
    dateRange: { start: startDate, end: new Date() }
  })
}

async function getTaxReport(shopId: number, startDate: Date) {
  // Tax-relevant transactions
  const taxData = await pool.query(`
    SELECT 
      DATE_TRUNC('month', p.created_at) as period,
      COUNT(*) as total_transactions,
      COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0)::float as card_deposits,
      COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.tip_amount ELSE 0 END), 0)::float as card_tips,
      COALESCE(SUM(CASE WHEN p.payment_method IN ('apple_pay', 'google_pay') THEN p.amount ELSE 0 END), 0)::float as wallet_deposits,
      COALESCE(SUM(CASE WHEN p.payment_method IN ('apple_pay', 'google_pay') THEN p.tip_amount ELSE 0 END), 0)::float as wallet_tips,
      COALESCE(SUM(p.amount), 0)::float as total_deposits,
      COALESCE(SUM(p.tip_amount), 0)::float as total_tips,
      COALESCE(SUM(p.amount) + SUM(p.tip_amount), 0)::float as gross_revenue,
      COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0)::float as refunds
    FROM payments p
    WHERE p.shop_id = $1 AND p.created_at >= $2
    GROUP BY DATE_TRUNC('month', p.created_at)
    ORDER BY period DESC
  `, [shopId, startDate])

  // Calculate totals
  const totals = taxData.rows.reduce((acc, row) => ({
    total_transactions: acc.total_transactions + (row.total_transactions || 0),
    card_deposits: acc.card_deposits + (row.card_deposits || 0),
    card_tips: acc.card_tips + (row.card_tips || 0),
    wallet_deposits: acc.wallet_deposits + (row.wallet_deposits || 0),
    wallet_tips: acc.wallet_tips + (row.wallet_tips || 0),
    gross_revenue: acc.gross_revenue + (row.gross_revenue || 0),
    refunds: acc.refunds + (row.refunds || 0),
    net_revenue: (acc.gross_revenue + (row.gross_revenue || 0)) - (acc.refunds + (row.refunds || 0))
  }), {
    total_transactions: 0,
    card_deposits: 0,
    card_tips: 0,
    wallet_deposits: 0,
    wallet_tips: 0,
    gross_revenue: 0,
    refunds: 0,
    net_revenue: 0
  })

  return NextResponse.json({
    success: true,
    reportType: 'tax',
    monthly: taxData.rows,
    summary: totals,
    taxableIncome: totals.gross_revenue,
    tips: totals.card_tips + totals.wallet_tips
  })
}

async function getCustomerReport(shopId: number, startDate: Date) {
  // Customer metrics
  const customerMetrics = await pool.query(`
    SELECT 
      COUNT(DISTINCT c.id) as total_customers,
      COUNT(DISTINCT CASE WHEN a.created_at >= $2 THEN c.id ELSE NULL END) as new_customers,
      COUNT(DISTINCT CASE WHEN (SELECT COUNT(*) FROM appointments a2 WHERE a2.customer_id = c.id AND a2.shop_id = $1) > 1 THEN c.id ELSE NULL END) as repeat_customers,
      ROUND(COUNT(DISTINCT CASE WHEN (SELECT COUNT(*) FROM appointments a2 WHERE a2.customer_id = c.id AND a2.shop_id = $1) > 1 THEN c.id ELSE NULL END)::numeric / COUNT(DISTINCT c.id) * 100, 2) as repeat_customer_percentage
    FROM customers c
    LEFT JOIN appointments a ON a.customer_id = c.id AND a.shop_id = $1
    WHERE c.shop_id = $1
  `, [shopId, startDate])

  // Top customers by bookings
  const topCustomers = await pool.query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      COUNT(a.id) as total_bookings,
      MAX(a.created_at) as last_booking,
      COALESCE(SUM(p.amount + p.tip_amount), 0)::float as total_spent
    FROM customers c
    LEFT JOIN appointments a ON a.customer_id = c.id AND a.shop_id = $1
    LEFT JOIN payments p ON p.appointment_id = a.id AND p.status = 'succeeded'
    WHERE c.shop_id = $1 AND a.created_at >= $2
    GROUP BY c.id, c.name, c.email
    ORDER BY total_bookings DESC
    LIMIT 20
  `, [shopId, startDate])

  // Customer lifetime value
  const lifetimeValue = await pool.query(`
    SELECT 
      ROUND(AVG(total_spent)::numeric, 2) as avg_customer_value,
      MAX(total_spent)::float as max_customer_value,
      MIN(total_spent)::float as min_customer_value,
      ROUND(SUM(total_spent)::numeric / COUNT(*)::numeric, 2) as total_value_per_customer
    FROM (
      SELECT 
        COALESCE(SUM(p.amount + p.tip_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN appointments a ON a.customer_id = c.id AND a.shop_id = $1
      LEFT JOIN payments p ON p.appointment_id = a.id AND p.status = 'succeeded'
      WHERE c.shop_id = $1
      GROUP BY c.id
    ) sub
  `, [shopId])

  return NextResponse.json({
    success: true,
    reportType: 'customer',
    metrics: customerMetrics.rows[0],
    topCustomers: topCustomers.rows,
    lifetimeValue: lifetimeValue.rows[0]
  })
}

async function getPaymentReport(shopId: number, startDate: Date) {
  // Payment method breakdown
  const paymentMethods = await pool.query(`
    SELECT 
      p.payment_method,
      COUNT(*) as transaction_count,
      COALESCE(SUM(p.amount), 0)::float as deposits,
      COALESCE(SUM(p.tip_amount), 0)::float as tips,
      COALESCE(SUM(p.amount + p.tip_amount), 0)::float as total,
      ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM payments WHERE shop_id = $1 AND created_at >= $2)::numeric * 100, 2) as percentage
    FROM payments p
    WHERE p.shop_id = $1 AND p.created_at >= $2 AND p.status = 'succeeded'
    GROUP BY p.payment_method
    ORDER BY total DESC
  `, [shopId, startDate])

  // Failed payments
  const failedPayments = await pool.query(`
    SELECT 
      COUNT(*) as failed_count,
      COALESCE(SUM(p.amount), 0)::float as failed_amount,
      STRING_AGG(DISTINCT p.failure_reason, ', ') as common_failures
    FROM payments p
    WHERE p.shop_id = $1 AND p.created_at >= $2 AND p.status = 'failed'
  `, [shopId, startDate])

  // Refunds
  const refunds = await pool.query(`
    SELECT 
      COUNT(*) as refund_count,
      COALESCE(SUM(p.amount), 0)::float as refund_amount,
      ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM payments WHERE shop_id = $1 AND created_at >= $2)::numeric * 100, 2) as refund_rate
    FROM payments p
    WHERE p.shop_id = $1 AND p.created_at >= $2 AND p.status = 'refunded'
  `, [shopId])

  return NextResponse.json({
    success: true,
    reportType: 'payment',
    paymentMethods: paymentMethods.rows,
    failedPayments: failedPayments.rows[0],
    refunds: refunds.rows[0]
  })
}

async function getCancellationReport(shopId: number, startDate: Date) {
  // Cancellation analysis
  const cancellationStats = await pool.query(`
    SELECT 
      COUNT(*) as total_cancellations,
      ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM appointments WHERE shop_id = $1 AND created_at >= $2)::numeric * 100, 2) as cancellation_rate,
      ROUND(AVG(EXTRACT(DAY FROM (a.cancelled_at - a.created_at)))::numeric, 1) as avg_days_before_cancellation
    FROM appointments a
    WHERE a.shop_id = $1 AND a.created_at >= $2 AND a.status = 'cancelled'
  `, [shopId, startDate])

  // Cancellation by day of week
  const cancellationByDay = await pool.query(`
    SELECT 
      CASE 
        WHEN EXTRACT(DOW FROM a.start_time) = 0 THEN 'Sunday'
        WHEN EXTRACT(DOW FROM a.start_time) = 1 THEN 'Monday'
        WHEN EXTRACT(DOW FROM a.start_time) = 2 THEN 'Tuesday'
        WHEN EXTRACT(DOW FROM a.start_time) = 3 THEN 'Wednesday'
        WHEN EXTRACT(DOW FROM a.start_time) = 4 THEN 'Thursday'
        WHEN EXTRACT(DOW FROM a.start_time) = 5 THEN 'Friday'
        WHEN EXTRACT(DOW FROM a.start_time) = 6 THEN 'Saturday'
      END as day,
      COUNT(*) as cancellations,
      ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER()::numeric * 100, 2) as percentage
    FROM appointments a
    WHERE a.shop_id = $1 AND a.created_at >= $2 AND a.status = 'cancelled'
    GROUP BY EXTRACT(DOW FROM a.start_time)
  `, [shopId])

  // Cancellation reasons distribution (if stored)
  const cancellationReasons = await pool.query(`
    SELECT 
      a.cancellation_reason,
      COUNT(*) as count,
      ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM appointments WHERE shop_id = $1 AND created_at >= $2 AND status = 'cancelled')::numeric * 100, 2) as percentage
    FROM appointments a
    WHERE a.shop_id = $1 AND a.created_at >= $2 AND a.status = 'cancelled'
    GROUP BY a.cancellation_reason
    ORDER BY count DESC
  `, [shopId])

  return NextResponse.json({
    success: true,
    reportType: 'cancellation',
    stats: cancellationStats.rows[0],
    byDayOfWeek: cancellationByDay.rows,
    reasons: cancellationReasons.rows
  })
}
