import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { BarberCommissionOverrideSchema } from '@/lib/schemas/commission';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * PATCH /api/commissions/rates/[barberId]
 * Set custom commission rate for a specific barber
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ barberId: string }> }
) {
  try {
    const { barberId } = await params;
    const body = await request.json();
    const { shopId, ...overrideData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = BarberCommissionOverrideSchema.safeParse(overrideData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid override data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();

    const overrideId = uuidv4();
    const now = new Date();
    const userId = request.headers.get('x-user-id') || 'system';

    const query = `
      INSERT INTO barber_commission_overrides (
        id, shop_id, barber_id, rate_type, base_rate,
        tiered_rules, service_rates, effective_date, expires_at,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await client.query(query, [
      overrideId,
      shopId,
      barberId,
      validation.data.rate_type || null,
      validation.data.base_rate || null,
      validation.data.tiered_rules ? JSON.stringify(validation.data.tiered_rules) : null,
      validation.data.service_rates ? JSON.stringify(validation.data.service_rates) : null,
      now,
      validation.data.expires_at || null,
      now,
      now,
      userId,
    ]);

    await client.end();

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating barber commission rate:', error);
    return NextResponse.json(
      { error: 'Failed to update barber commission rate' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commissions/rates/[barberId]
 * Get barber's active commission rate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barberId: string }> }
) {
  try {
    const { barberId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    await client.connect();

    // Get active override
    const overrideQuery = `
      SELECT * FROM barber_commission_overrides
      WHERE shop_id = $1 AND barber_id = $2
        AND effective_date <= NOW()
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY effective_date DESC
      LIMIT 1
    `;

    const overrideResult = await client.query(overrideQuery, [shopId, barberId]);

    if (overrideResult.rows.length > 0) {
      await client.end();
      return NextResponse.json(overrideResult.rows[0]);
    }

    // Get default rate
    const defaultQuery = `
      SELECT * FROM commission_rates
      WHERE shop_id = $1 AND is_default = true
      LIMIT 1
    `;

    const defaultResult = await client.query(defaultQuery, [shopId]);
    await client.end();

    if (defaultResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No commission rate found' },
        { status: 404 }
      );
    }

    return NextResponse.json(defaultResult.rows[0]);
  } catch (error) {
    console.error('Error fetching barber commission rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch barber commission rate' },
      { status: 500 }
    );
  }
}
