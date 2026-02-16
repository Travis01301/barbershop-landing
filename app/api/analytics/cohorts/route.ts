import { NextRequest, NextResponse } from 'next/server';
import analyticsService from '@/lib/advanced-analytics-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/analytics/cohorts');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const cohortMonth = searchParams.get('cohortMonth');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const cohorts = await analyticsService.analyzeCohorts(
      parseInt(shopId),
      cohortMonth || undefined
    );

    return NextResponse.json({
      shopId: parseInt(shopId),
      data: cohorts,
      summary: {
        totalCohorts: cohorts.length,
        totalCustomersAcquired: cohorts.reduce((sum, c) => c.cohortSize + sum, 0),
        totalAcquisitionRevenue: cohorts.reduce((sum, c) => sum + c.acquisitionMonthRevenue, 0),
        averageCohortSize: cohorts.length > 0 ? cohorts.reduce((sum, c) => sum + c.cohortSize, 0) / cohorts.length : 0,
      },
    });
  } catch (error) {
    log.error('Failed to analyze cohorts', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze cohorts' },
      { status: 500 }
    );
  }
}
