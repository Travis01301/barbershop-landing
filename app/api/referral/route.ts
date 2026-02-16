import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  GenerateReferralCodeSchema,
  ValidateReferralCodeSchema,
  ApplyReferralRewardSchema,
  GenerateReferralCodeInput,
  ValidateReferralCodeInput,
  ApplyReferralRewardInput,
} from '@/lib/recurring-validation';
import * as loyaltyService from '@/lib/loyalty-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.referral');

/**
 * POST /api/referral/generate - Generate referral code
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
    const action = body.action || 'generate';

    if (action === 'apply') {
      // Apply referral reward
      const validation = validateInput<ApplyReferralRewardInput>(
        ApplyReferralRewardSchema,
        {
          shopId: decoded.shopId,
          ...body,
        },
        'referral.apply'
      );

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      const reward = await loyaltyService.applyReferralReward(validation.data);

      if (!reward) {
        return NextResponse.json({ error: 'Failed to apply reward' }, { status: 500 });
      }

      routeLogger.info('Referral reward applied');
      return NextResponse.json({ success: true, reward }, { status: 201 });
    } else {
      // Generate referral code
      const validation = validateInput<GenerateReferralCodeInput>(
        GenerateReferralCodeSchema,
        {
          shopId: decoded.shopId,
          ...body,
        },
        'referral.generate'
      );

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validation.errors },
          { status: 400 }
        );
      }

      const code = await loyaltyService.generateReferralCode(
        validation.data.customerId,
        decoded.shopId
      );

      if (!code) {
        return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
      }

      routeLogger.info('Referral code generated');
      return NextResponse.json({ success: true, code }, { status: 201 });
    }
  } catch (error) {
    routeLogger.error('Error processing referral', error);
    return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
  }
}

/**
 * GET /api/referral/validate?code={code} - Validate referral code
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
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 });
    }

    const validation = validateInput<ValidateReferralCodeInput>(
      ValidateReferralCodeSchema,
      {
        referralCode: code,
        shopId: decoded.shopId,
      },
      'referral.validate'
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const referrer = await loyaltyService.validateReferralCode(code, decoded.shopId);

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    const stats = await loyaltyService.getReferralStats(referrer.id, decoded.shopId);

    routeLogger.info('Referral code validated', { code });
    return NextResponse.json({ success: true, referrer, stats });
  } catch (error) {
    routeLogger.error('Error validating referral code', error);
    return NextResponse.json({ error: 'Failed to validate referral code' }, { status: 500 });
  }
}
