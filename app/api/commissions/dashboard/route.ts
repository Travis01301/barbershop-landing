import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionService } from '@/lib/services/commission-service';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/commissions/dashboard
 * Get admin dashboard view of all barbers' commissions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(year, monthNum - 1, 1);

    await client.connect();
    const service = new CommissionService(client);

    const dashboardData = await service.getDashboardData(shopId, monthDate);

    await client.end();

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
