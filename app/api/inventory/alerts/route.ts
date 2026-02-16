import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { inventoryService } from '@/lib/inventory-service';

const routeLogger = logger.createChild('api.inventory.alerts');

/**
 * GET /api/inventory/alerts
 * Get low stock alerts for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const acknowledged = searchParams.get('acknowledged');

    if (!shop_id) {
      return Response.json({ error: 'shop_id is required' }, { status: 400 });
    }

    const alerts = await inventoryService.getAlerts(parseInt(shop_id), {
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
    });

    return Response.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    routeLogger.error('Failed to fetch alerts', error);
    return Response.json(
      {
        error: 'Failed to fetch alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/alerts
 * Acknowledge an alert
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, user_id } = body;

    if (!alert_id) {
      return Response.json(
        { error: 'alert_id is required' },
        { status: 400 }
      );
    }

    const alert = await inventoryService.acknowledgeAlert(alert_id, user_id);

    return Response.json({
      success: true,
      message: 'Alert acknowledged',
      alert,
    });
  } catch (error) {
    routeLogger.error('Failed to acknowledge alert', error);
    return Response.json(
      {
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
