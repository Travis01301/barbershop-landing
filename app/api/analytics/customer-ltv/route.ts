import { NextRequest, NextResponse } from 'next/server';
import analyticsService from '@/lib/advanced-analytics-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/analytics/customer-ltv');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const customerId = searchParams.get('customerId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const ltv = await analyticsService.calculateCustomerLTV(
      parseInt(shopId),
      customerId ? parseInt(customerId) : undefined
    );

    // Segment customers
    const segments: Record<string, number> = {
      vip: 0,
      'high-value': 0,
      regular: 0,
      'at-risk': 0,
      inactive: 0,
    };

    ltv.forEach((customer) => {
      segments[customer.lifetimeValueCategory]++;
    });

    return NextResponse.json({
      shopId: parseInt(shopId),
      data: ltv,
      summary: {
        totalCustomers: ltv.length,
        totalRevenue: ltv.reduce((sum, c) => sum + c.totalSpent, 0),
        averageLTV: ltv.length > 0 ? ltv.reduce((sum, c) => sum + c.totalSpent, 0) / ltv.length : 0,
        segments,
        highValueCustomers: ltv.filter((c) => c.lifetimeValueCategory === 'vip' || c.lifetimeValueCategory === 'high-value').length,
        atRiskCustomers: ltv.filter((c) => c.lifetimeValueCategory === 'at-risk').length,
        averageChurnRisk: ltv.length > 0 ? ltv.reduce((sum, c) => sum + c.predictedChurnRisk, 0) / ltv.length : 0,
      },
    });
  } catch (error) {
    log.error('Failed to get customer LTV analytics', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get customer LTV analytics' },
      { status: 500 }
    );
  }
}
