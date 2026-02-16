import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  EarnLoyaltyPointsSchema,
  RedeemLoyaltyPointsSchema,
  EarnLoyaltyPointsInput,
  RedeemLoyaltyPointsInput,
} from '@/lib/recurring-validation';
import * as loyaltyService from '@/lib/loyalty-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.loyalty');

/**
 * POST /api/loyalty/earn - Earn loyalty points from appointment
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Determine which schema to use based on action
    const action = body.action || 'earn';

    if (action === 'redeem') {
      const validation = validateInput<RedeemLoyaltyPointsInput>(
        RedeemLoyaltyPointsSchema,
        body,
        'loyalty.redeem'
      );

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      const result = await loyaltyService.redeemLoyaltyPoints({
        ...validation.data,
        shopId: decoded.shopId,
      });

      routeLogger.info('Loyalty points redeemed', {
        customerId: validation.data.customerId,
      });

      return NextResponse.json(
        {
          success: true,
          transaction: result?.transaction,
          discountAmount: result?.discountAmount,
        },
        { status: 201 }
      );
    } else {
      const validation = validateInput<EarnLoyaltyPointsInput>(
        EarnLoyaltyPointsSchema,
        body,
        'loyalty.earn'
      );

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      const transaction = await loyaltyService.earnLoyaltyPoints({
        ...validation.data,
        shopId: decoded.shopId,
      });

      routeLogger.info('Loyalty points earned', { customerId: validation.data.customerId });

      return NextResponse.json({ success: true, transaction }, { status: 201 });
    }
  } catch (error) {
    routeLogger.error('Error processing loyalty transaction', error);
    return NextResponse.json(
      { error: 'Failed to process loyalty transaction' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/loyalty/balance?customerId={id} - Get loyalty balance
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 });
    }

    const balance = await loyaltyService.getLoyaltyBalance(
      parseInt(customerId),
      decoded.shopId
    );

    if (!balance) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    routeLogger.info('Loyalty balance fetched', { customerId });
    return NextResponse.json({ success: true, balance });
  } catch (error) {
    routeLogger.error('Error fetching loyalty balance', error);
    return NextResponse.json({ error: 'Failed to fetch loyalty balance' }, { status: 500 });
  }
}
