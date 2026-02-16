import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { promoService } from '@/lib/promo-service';

const routeLogger = logger.createChild('api.promo.analytics');

/**
 * GET /api/promo/analytics
 * Get promo code usage analytics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    routeLogger.debug('Fetching promo code analytics');

    const analytics = await promoService.getAnalytics();

    // Calculate additional metrics
    const avgDiscountPerCode = analytics.totalCodes > 0 
      ? (analytics.totalDiscountApplied / analytics.totalCodes).toFixed(2)
      : '0.00';

    const avgRedemptionsPerCode = analytics.totalCodes > 0
      ? (analytics.totalRedemptions / analytics.totalCodes).toFixed(1)
      : '0.0';

    routeLogger.debug('Analytics generated', {
      totalCodes: analytics.totalCodes,
      activeCodes: analytics.activeCodes,
      totalRedemptions: analytics.totalRedemptions,
      totalDiscountApplied: analytics.totalDiscountApplied,
    });

    return Response.json({
      success: true,
      summary: {
        totalCodes: analytics.totalCodes,
        activeCodes: analytics.activeCodes,
        totalRedemptions: analytics.totalRedemptions,
        totalDiscountApplied: parseFloat(analytics.totalDiscountApplied.toString()),
        avgDiscountPerCode: parseFloat(avgDiscountPerCode),
        avgRedemptionsPerCode: parseFloat(avgRedemptionsPerCode),
      },
      codes: analytics.codes.map((code) => ({
        code: code.code,
        discountPercent: code.discountPercent,
        durationMonths: 6,
        usedCount: code.usedCount,
        maxUses: code.maxUses,
        utilizationRate: code.maxUses ? `${((code.usedCount / code.maxUses) * 100).toFixed(1)}%` : 'Unlimited',
        isActive: code.isActive,
        expiresAt: code.expiresAt,
        redemptions: code.redemptions,
        totalDiscountGiven: parseFloat(code.totalDiscountGiven.toString()),
        avgDiscountPerRedemption: code.redemptions > 0 
          ? parseFloat((code.totalDiscountGiven / code.redemptions).toFixed(2))
          : 0,
      })),
    });
  } catch (error) {
    routeLogger.error('Analytics fetch error:', error);
    return Response.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
