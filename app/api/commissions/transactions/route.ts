import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionCalculationInputSchema, CommissionTransactionFilterSchema } from '@/lib/schemas/commission';
import { CommissionService } from '@/lib/services/commission-service';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/commissions/transactions
 * Calculate and record commission for an appointment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, ...transactionData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = CommissionCalculationInputSchema.safeParse(transactionData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid transaction data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();
    const service = new CommissionService(client);

    const transaction = await service.calculateCommission(validation.data, shopId);

    await client.end();

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error calculating commission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate commission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commissions/transactions
 * Get barber's commission transactions with filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const barberId = searchParams.get('barberId');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    if (!shopId || !barberId) {
      return NextResponse.json(
        { error: 'shopId and barberId are required' },
        { status: 400 }
      );
    }

    await client.connect();

    // Get transactions
    const query = `
      SELECT * FROM commission_transactions
      WHERE shop_id = $1 AND barber_id = $2
      ORDER BY transaction_date DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await client.query(query, [shopId, barberId, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM commission_transactions
      WHERE shop_id = $1 AND barber_id = $2
    `;

    const countResult = await client.query(countQuery, [shopId, barberId]);
    await client.end();

    return NextResponse.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
