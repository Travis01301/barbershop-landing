import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { inventoryService } from '@/lib/inventory-service';

const routeLogger = logger.createChild('api.inventory.use');

/**
 * POST /api/inventory/use
 * Record supply usage (e.g., during appointment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shop_id,
      item_id,
      quantity,
      appointment_id,
      notes,
      created_by,
    } = body;

    if (!shop_id || !item_id || quantity === undefined || quantity <= 0) {
      return Response.json(
        {
          error: 'Missing or invalid required fields',
        },
        { status: 400 }
      );
    }

    const transaction = await inventoryService.recordTransaction(
      shop_id,
      item_id,
      'use',
      quantity,
      {
        appointment_id,
        notes,
        created_by,
      }
    );

    return Response.json(
      {
        success: true,
        message: 'Supply usage recorded',
        transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    routeLogger.error('Failed to record supply usage', error);
    return Response.json(
      {
        error: 'Failed to record supply usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
