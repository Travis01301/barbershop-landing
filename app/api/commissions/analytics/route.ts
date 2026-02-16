import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/commissions/analytics
 * Get commission analytics and trends
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const period = searchParams.get('period') || 'month'; // month, quarter, year

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);

    await client.connect();

    // Revenue trend by day
    const revenueQuery = `
      SELECT
        DATE(ct.transaction_date) as date,
        COALESCE(SUM(ct.service_price), 0) as revenue,
        COALESCE(SUM(ct.base_commission), 0) as commission
      FROM commission_transactions ct
      WHERE ct.shop_id = $1
        AND EXTRACT(YEAR FROM ct.transaction_date) = $2
        AND EXTRACT(MONTH FROM ct.transaction_date) = $3
        AND ct.status IN ('completed', 'pending')
      GROUP BY DATE(ct.transaction_date)
      ORDER BY DATE(ct.transaction_date) ASC
    `;

    const revenueResult = await client.query(revenueQuery, [shopId, year, monthNum]);

    // Top earners
    const topEarnersQuery = `
      SELECT
        ct.barber_id,
        COUNT(DISTINCT ct.appointment_id) as appointments,
        COALESCE(SUM(ct.base_commission), 0) as earnings
      FROM commission_transactions ct
      WHERE ct.shop_id = $1
        AND EXTRACT(YEAR FROM ct.transaction_date) = $2
        AND EXTRACT(MONTH FROM ct.transaction_date) = $3
        AND ct.status IN ('completed', 'pending')
      GROUP BY ct.barber_id
      ORDER BY earnings DESC
      LIMIT 10
    `;

    const topEarnersResult = await client.query(topEarnersQuery, [shopId, year, monthNum]);

    // Service breakdown
    const serviceBreakdownQuery = `
      SELECT
        ct.service_type,
        COALESCE(SUM(ct.service_price), 0) as revenue,
        COUNT(*) as count
      FROM commission_transactions ct
      WHERE ct.shop_id = $1
        AND EXTRACT(YEAR FROM ct.transaction_date) = $2
        AND EXTRACT(MONTH FROM ct.transaction_date) = $3
        AND ct.status IN ('completed', 'pending')
      GROUP BY ct.service_type
      ORDER BY revenue DESC
    `;

    const serviceBreakdownResult = await client.query(serviceBreakdownQuery, [shopId, year, monthNum]);

    // Commission distribution
    const distributionQuery = `
      SELECT
        CASE
          WHEN ct.base_commission < 50 THEN '$0-$50'
          WHEN ct.base_commission < 100 THEN '$50-$100'
          WHEN ct.base_commission < 200 THEN '$100-$200'
          WHEN ct.base_commission < 500 THEN '$200-$500'
          ELSE '$500+'
        END as range,
        COUNT(*) as count
      FROM commission_transactions ct
      WHERE ct.shop_id = $1
        AND EXTRACT(YEAR FROM ct.transaction_date) = $2
        AND EXTRACT(MONTH FROM ct.transaction_date) = $3
        AND ct.status IN ('completed', 'pending')
      GROUP BY range
      ORDER BY range ASC
    `;

    const distributionResult = await client.query(distributionQuery, [shopId, year, monthNum]);

    await client.end();

    return NextResponse.json({
      month: startDate.toISOString().slice(0, 7),
      revenue_trend: revenueResult.rows.map((row) => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        commission: parseFloat(row.commission),
      })),
      top_earners: topEarnersResult.rows.map((row) => ({
        barber_id: row.barber_id,
        barber_name: `Barber ${row.barber_id.substring(0, 8)}`,
        earnings: parseFloat(row.earnings),
        appointments: row.appointments,
      })),
      service_breakdown: serviceBreakdownResult.rows.map((row) => ({
        service_type: row.service_type,
        revenue: parseFloat(row.revenue),
        count: row.count,
      })),
      commission_distribution: distributionResult.rows.map((row) => ({
        range: row.range,
        count: row.count,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
