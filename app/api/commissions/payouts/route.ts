import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionPayoutCalculateSchema, CommissionPayoutProcessSchema, CommissionPayoutFilterSchema } from '@/lib/schemas/commission';
import { CommissionService } from '@/lib/services/commission-service';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/commissions/payouts/calculate
 * Calculate pending commissions for a period
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, ...calculationData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = CommissionPayoutCalculateSchema.safeParse(calculationData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payout calculation data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();
    const service = new CommissionService(client);

    const payouts = await service.calculatePayouts(
      shopId,
      validation.data.period_start,
      validation.data.period_end,
      validation.data.barber_id
    );

    await client.end();

    return NextResponse.json(payouts, { status: 201 });
  } catch (error) {
    console.error('Error calculating payouts:', error);
    return NextResponse.json(
      { error: 'Failed to calculate payouts' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commissions/payouts
 * Get payout history with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const barberId = searchParams.get('barberId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    await client.connect();

    let query = `
      SELECT * FROM commission_payouts
      WHERE shop_id = $1
    `;

    const params: any[] = [shopId];
    let paramCount = 1;

    if (barberId) {
      paramCount++;
      query += ` AND barber_id = $${paramCount}`;
      params.push(barberId);
    }

    if (status) {
      paramCount++;
      query += ` AND payout_status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY payout_period_start DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM commission_payouts
      WHERE shop_id = $1
    `;

    const countParams: any[] = [shopId];

    if (barberId) {
      countQuery += ` AND barber_id = $2`;
      countParams.push(barberId);
    }

    if (status) {
      const statusParamIndex = barberId ? 3 : 2;
      countQuery += ` AND payout_status = $${statusParamIndex}`;
      countParams.push(status);
    }

    const countResult = await client.query(countQuery, countParams);
    await client.end();

    return NextResponse.json({
      payouts: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
