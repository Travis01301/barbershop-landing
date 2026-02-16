import { NextRequest, NextResponse } from 'next/server';
import analyticsService from '@/lib/advanced-analytics-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/analytics/demand-forecast');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const daysAhead = searchParams.get('daysAhead') ? parseInt(searchParams.get('daysAhead')!) : 7;

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const forecasts = await analyticsService.forecastDemand(parseInt(shopId), daysAhead);

    // Group by date
    const byDate: Record<string, any[]> = {};
    forecasts.forEach((forecast) => {
      if (!byDate[forecast.forecastDate]) {
        byDate[forecast.forecastDate] = [];
      }
      byDate[forecast.forecastDate].push(forecast);
    });

    return NextResponse.json({
      shopId: parseInt(shopId),
      daysAhead,
      data: forecasts,
      byDate,
      summary: {
        totalForecasts: forecasts.length,
        peakHours: forecasts.filter((f) => f.peakHour).length,
        averageExpectedDemand:
          forecasts.length > 0
            ? forecasts.reduce((sum, f) => sum + f.expectedDemand, 0) / forecasts.length
            : 0,
        maxStaffRequired: Math.max(...forecasts.map((f) => f.recommendedStaffCount)),
      },
    });
  } catch (error) {
    log.error('Failed to forecast demand', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to forecast demand' },
      { status: 500 }
    );
  }
}
