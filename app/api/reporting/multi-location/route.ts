import { NextRequest, NextResponse } from 'next/server';
import multiLocationService from '@/lib/multi-location-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/reporting/multi-location');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentShopId = searchParams.get('parentShopId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!parentShopId) {
      return NextResponse.json(
        { error: 'parentShopId is required' },
        { status: 400 }
      );
    }

    // Refresh consolidated revenue first
    await multiLocationService.refreshConsolidatedRevenue(parseInt(parentShopId));

    // Get consolidated revenue
    const revenue = await multiLocationService.getConsolidatedRevenue(
      parseInt(parentShopId),
      startDate || undefined,
      endDate || undefined
    );

    // Get location hierarchy
    const hierarchy = await multiLocationService.getLocationHierarchy(parseInt(parentShopId));

    // Get consolidated metrics
    const totalRevenue = revenue.reduce((sum, row) => sum + (parseFloat(row.total_revenue) || 0), 0);
    const totalAppointments = revenue.reduce((sum, row) => sum + (row.appointment_count || 0), 0);

    return NextResponse.json({
      parentShopId: parseInt(parentShopId),
      hierarchy,
      revenue,
      metrics: {
        totalRevenue,
        totalAppointments,
        averageRevenuePerLocation: revenue.length > 0 ? totalRevenue / revenue.length : 0,
        locationCount: hierarchy.children.length,
      },
    });
  } catch (error) {
    log.error('Failed to get multi-location reporting', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get multi-location reporting' },
      { status: 500 }
    );
  }
}
