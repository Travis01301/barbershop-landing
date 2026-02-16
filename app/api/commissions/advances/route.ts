import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { AdvanceRequestSchema } from '@/lib/schemas/commission';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/commissions/advances
 * Request an advance on commissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, barber_id, requested_amount, available_balance } = body;

    if (!shopId || !barber_id) {
      return NextResponse.json(
        { error: 'shopId and barber_id are required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = AdvanceRequestSchema.safeParse({
      barber_id,
      requested_amount,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid advance request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Validate amount doesn't exceed available
    if (requested_amount > available_balance) {
      return NextResponse.json(
        { error: 'Requested amount exceeds available balance' },
        { status: 400 }
      );
    }

    await client.connect();

    const advanceId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO commission_advances (
        id, shop_id, barber_id, requested_amount, available_balance,
        advance_status, request_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await client.query(query, [
      advanceId,
      shopId,
      barber_id,
      requested_amount,
      available_balance,
      'pending',
      now,
      now,
      now,
    ]);

    await client.end();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating advance request:', error);
    return NextResponse.json(
      { error: 'Failed to create advance request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commissions/advances
 * Get advance requests for a barber
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const barberId = searchParams.get('barberId');

    if (!shopId || !barberId) {
      return NextResponse.json(
        { error: 'shopId and barberId are required' },
        { status: 400 }
      );
    }

    await client.connect();

    const query = `
      SELECT * FROM commission_advances
      WHERE shop_id = $1 AND barber_id = $2
      ORDER BY request_date DESC
    `;

    const result = await client.query(query, [shopId, barberId]);
    await client.end();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching advance requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch advance requests' },
      { status: 500 }
    );
  }
}
