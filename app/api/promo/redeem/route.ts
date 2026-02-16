import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { promoService } from '@/lib/promo-service';
import { RedeemPromoCodeSchema, validateInput } from '@/lib/validation';

const routeLogger = logger.createChild('api.promo.redeem');

/**
 * POST /api/promo/redeem
 * Redeem a promo code for a shop
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateInput(RedeemPromoCodeSchema, body, 'promo.redeem');
    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const { code, shopId, subscriptionId } = validation.data!;

    routeLogger.debug('Redeeming promo code', { code, shopId, subscriptionId });

    const result = await promoService.redeemPromoCode(code, shopId, subscriptionId);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          error: result.error || result.message,
          message: result.message,
        },
        { status: 400 }
      );
    }

    routeLogger.info('Promo code redeemed successfully', {
      code,
      shopId,
      discountApplied: result.discountApplied,
    });

    return Response.json(
      {
        success: true,
        message: result.message,
        discountApplied: result.discountApplied,
        discountPercent: result.code?.discountPercent,
        durationMonths: result.code?.durationMonths,
        discountEndDate: result.discountEndDate,
        stripeCouponId: result.stripeCouponId,
        savings: `$${(result.discountApplied || 0).toFixed(2)} per month for ${result.code?.durationMonths} months`,
      },
      { status: 200 }
    );
  } catch (error) {
    routeLogger.error('Redemption error:', error);
    return Response.json(
      {
        error: 'Failed to redeem promo code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
