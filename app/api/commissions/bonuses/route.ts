import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionBonusCreateSchema2 } from '@/lib/schemas/commission';
import { CommissionService } from '@/lib/services/commission-service';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/commissions/bonuses
 * Add a performance bonus for a barber (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, ...bonusData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = CommissionBonusCreateSchema2.safeParse(bonusData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid bonus data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();

    const bonusId = uuidv4();
    const now = new Date();
    const userId = request.headers.get('x-user-id') || 'system';

    const query = `
      INSERT INTO commission_bonuses (
        id, shop_id, barber_id, bonus_type, trigger_metric,
        trigger_value, bonus_amount, bonus_percentage, calculation_month,
        bonus_status, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await client.query(query, [
      bonusId,
      shopId,
      validation.data.barber_id,
      validation.data.bonus_type,
      validation.data.trigger_metric,
      validation.data.trigger_value,
      validation.data.bonus_amount || null,
      validation.data.bonus_percentage || null,
      validation.data.calculation_month,
      'pending',
      now,
      now,
      userId,
    ]);

    await client.end();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating bonus:', error);
    return NextResponse.json(
      { error: 'Failed to create bonus' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/commissions/bonuses
 * Get bonuses for a barber in a specific month
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get('shopId');
    const barberId = searchParams.get('barberId');
    const month = searchParams.get('month');

    if (!shopId || !barberId || !month) {
      return NextResponse.json(
        { error: 'shopId, barberId, and month are required' },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(year, monthNum - 1, 1);

    await client.connect();

    const query = `
      SELECT * FROM commission_bonuses
      WHERE shop_id = $1 AND barber_id = $2
        AND calculation_month = $3
      ORDER BY created_at DESC
    `;

    const result = await client.query(query, [shopId, barberId, monthDate]);
    await client.end();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bonuses' },
      { status: 500 }
    );
  }
}
