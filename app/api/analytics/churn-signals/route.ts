import { NextRequest, NextResponse } from 'next/server';
import analyticsService from '@/lib/advanced-analytics-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/analytics/churn-signals');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const daysThreshold = searchParams.get('daysThreshold') ? parseInt(searchParams.get('daysThreshold')!) : 60;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const signals = await analyticsService.detectChurnSignals(parseInt(shopId), daysThreshold);

    // Group by risk level
    const byRiskLevel: Record<string, any[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    signals.forEach((signal) => {
      byRiskLevel[signal.riskLevel].push(signal);
    });

    return NextResponse.json({
      shopId: parseInt(shopId),
      daysThreshold,
      data: signals,
      summary: {
        totalAtRisk: signals.length,
        critical: byRiskLevel.critical.length,
        high: byRiskLevel.high.length,
        medium: byRiskLevel.medium.length,
        low: byRiskLevel.low.length,
        averageChurnScore: signals.length > 0 ? signals.reduce((sum, s) => sum + s.churnScore, 0) / signals.length : 0,
      },
    });
  } catch (error) {
    log.error('Failed to get churn signals', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get churn signals' },
      { status: 500 }
    );
  }
}
