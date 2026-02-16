import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { CommissionPayoutProcessSchema } from '@/lib/schemas/commission';
import { CommissionService } from '@/lib/services/commission-service';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/commissions/payouts/process
 * Process payouts (create actual transfers)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, ...processData } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = CommissionPayoutProcessSchema.safeParse(processData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payout process data', details: validation.error.errors },
        { status: 400 }
      );
    }

    await client.connect();
    const service = new CommissionService(client);

    const processedPayouts = [];

    for (const payoutId of validation.data.payout_ids) {
      const payout = await service.processPayout(
        shopId,
        payoutId,
        validation.data.payout_method,
        validation.data.stripe_payout_id
      );
      processedPayouts.push(payout);
    }

    await client.end();

    return NextResponse.json(processedPayouts);
  } catch (error) {
    console.error('Error processing payouts:', error);
    return NextResponse.json(
      { error: 'Failed to process payouts' },
      { status: 500 }
    );
  }
}
