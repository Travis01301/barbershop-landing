import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionService } from '@/lib/services/commission-service';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/commissions/[barberId]/month/[YYYY-MM]
 * Get monthly commission statement for a barber
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barberId: string; month: string }> }
) {
  try {
    const { barberId, month } = await params;
    const shopId = request.nextUrl.searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Parse month string (YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM' },
        { status: 400 }
      );
    }

    const monthDate = new Date(year, monthNum - 1, 1);

    await client.connect();
    const service = new CommissionService(client);

    const statement = await service.getMonthlyStatement(shopId, barberId, monthDate);

    await client.end();

    return NextResponse.json(statement);
  } catch (error) {
    console.error('Error fetching monthly statement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly statement' },
      { status: 500 }
    );
  }
}
