import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { promoService } from '@/lib/promo-service';
import { parseQueryParam } from '@/lib/validation';

const routeLogger = logger.createChild('api.promo.validate');

/**
 * GET /api/promo/validate?code=LAUNCH50&shopId=1
 * Validate a promo code without redeeming it
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = parseQueryParam(searchParams.get('code'));
    const shopId = searchParams.get('shopId');

    if (!code) {
      return Response.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    routeLogger.debug('Validating promo code', { code, shopId });

    const result = await promoService.validatePromoCode(
      code,
      shopId ? parseInt(shopId) : undefined
    );

    routeLogger.debug('Validation result', {
      code,
      isValid: result.isValid,
      reason: result.reason,
    });

    if (result.isValid) {
      const promoCode = result.code!;
      return Response.json({
        success: true,
        isValid: true,
        code: promoCode.code,
        discountPercent: promoCode.discountPercent,
        durationMonths: promoCode.durationMonths,
        savings: (promoCode.discountPercent / 100) * 39, // Assuming $39/month base price
        message: `Get ${promoCode.discountPercent}% off for ${promoCode.durationMonths} months!`,
      });
    } else {
      return Response.json({
        success: false,
        isValid: false,
        reason: result.reason,
        message: `Invalid code: ${result.reason}`,
      });
    }
  } catch (error) {
    routeLogger.error('Validation error:', error);
    return Response.json(
      {
        error: 'Failed to validate promo code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
