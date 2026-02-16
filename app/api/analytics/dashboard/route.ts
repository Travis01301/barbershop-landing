import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsDashboard } from '@/lib/analytics-service';
import { query } from '@/lib/db';

/**
 * GET /api/analytics/dashboard?shopId=X&dateRange=7d|30d|90d
 *
 * Returns comprehensive analytics data for the dashboard including:
 * - Revenue metrics (total, daily, by service, by barber)
 * - Appointment metrics (completed, cancelled, no-show rates)
 * - Peak times heatmap
 * - Barber performance
 * - Customer acquisition trends
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const shopIdParam = searchParams.get('shopId');
    const dateRange = searchParams.get('dateRange') || '30d';

    // Validate required parameters
    if (!shopIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: shopId' },
        { status: 400 }
      );
    }

    const shopId = parseInt(shopIdParam, 10);
    if (isNaN(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shopId: must be a number' },
        { status: 400 }
      );
    }

    // Validate date range
    if (!['7d', '30d', '90d'].includes(dateRange)) {
      return NextResponse.json(
        {
          error: "Invalid dateRange. Must be one of: '7d', '30d', '90d'",
        },
        { status: 400 }
      );
    }

    // Verify shop exists
    const shopResult = await query<{ id: number }>(
      'SELECT id FROM shops WHERE id = $1',
      [shopId]
    );

    if (shopResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Get analytics data
    const analytics = await getAnalyticsDashboard(shopId, dateRange);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics dashboard',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
