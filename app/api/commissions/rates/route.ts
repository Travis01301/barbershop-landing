import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionRateCreateSchema } from '@/lib/schemas/commission';
import type { CommissionRate } from '@/lib/types/commission';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/commissions/rates
 * Get commission rates for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    await client.connect();

    const query = `
      SELECT * FROM commission_rates
      WHERE shop_id = $1
      ORDER BY is_default DESC, updated_at DESC
    `;

    const result = await client.query(query, [shopId]);
    await client.end();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching commission rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commission rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/commissions/rates/set
 * Create or update commission structure (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, ...rateData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = CommissionRateCreateSchema.safeParse(rateData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid commission rate data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();

    // Update existing default rate or create new one
    const rateId = uuidv4();
    const now = new Date();
    const userId = request.headers.get('x-user-id') || 'system';

    const query = `
      INSERT INTO commission_rates (
        id, shop_id, rate_type, base_rate, tiered_rules, 
        service_rates, is_default, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await client.query(query, [
      rateId,
      shopId,
      validation.data.rate_type,
      validation.data.base_rate,
      JSON.stringify(validation.data.tiered_rules || null),
      JSON.stringify(validation.data.service_rates || null),
      true,
      now,
      now,
      userId,
    ]);

    await client.end();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating commission rate:', error);
    return NextResponse.json(
      { error: 'Failed to create commission rate' },
      { status: 500 }
    );
  }
}
