import { NextRequest, NextResponse } from 'next/server';
import analyticsService from '@/lib/advanced-analytics-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/analytics/barber-performance');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId');
    const barberId = searchParams.get('barberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    const performance = await analyticsService.calculateBarberPerformance(
      parseInt(shopId),
      barberId ? parseInt(barberId) : undefined,
      startDate && endDate ? { startDate, endDate } : undefined
    );

    return NextResponse.json({
      shopId: parseInt(shopId),
      data: performance,
      summary: {
        totalBarbers: new Set(performance.map((p) => p.barberId)).size,
        totalRevenue: performance.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalAppointments: performance.reduce((sum, p) => sum + p.appointmentCount, 0),
        averageRevenuePerBarber:
          performance.length > 0
            ? performance.reduce((sum, p) => sum + p.totalRevenue, 0) / new Set(performance.map((p) => p.barberId)).size
            : 0,
      },
    });
  } catch (error) {
    log.error('Failed to get barber performance analytics', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get barber performance analytics' },
      { status: 500 }
    );
  }
}
