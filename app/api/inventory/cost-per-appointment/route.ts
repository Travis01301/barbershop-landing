import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { inventoryService } from '@/lib/inventory-service';

const routeLogger = logger.createChild('api.inventory.cost-per-appointment');

/**
 * GET /api/inventory/cost-per-appointment
 * Calculate cost per appointment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    if (!shop_id) {
      return Response.json({ error: 'shop_id is required' }, { status: 400 });
    }

    const costPerAppointment = await inventoryService.calculateCostPerAppointment(
      parseInt(shop_id),
      from_date ? new Date(from_date) : undefined,
      to_date ? new Date(to_date) : undefined
    );

    return Response.json({
      success: true,
      costPerAppointment,
      currency: 'USD',
    });
  } catch (error) {
    routeLogger.error('Failed to calculate cost per appointment', error);
    return Response.json(
      {
        error: 'Failed to calculate cost per appointment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
