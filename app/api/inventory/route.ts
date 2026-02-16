import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { inventoryService } from '@/lib/inventory-service';

const routeLogger = logger.createChild('api.inventory');

/**
 * POST /api/inventory
 * Add a new inventory item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shop_id,
      item_name,
      category,
      unit_cost,
      description,
      sku,
      current_quantity,
      low_stock_threshold,
      reorder_quantity,
      supplier_id,
    } = body;

    if (!shop_id || !item_name || !category || !unit_cost) {
      return Response.json(
        {
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const item = await inventoryService.addInventoryItem(
      shop_id,
      item_name,
      category,
      unit_cost,
      {
        description,
        sku,
        current_quantity,
        low_stock_threshold,
        reorder_quantity,
        supplier_id,
      }
    );

    return Response.json(
      {
        success: true,
        message: 'Inventory item added',
        item,
      },
      { status: 201 }
    );
  } catch (error) {
    routeLogger.error('Failed to add inventory item', error);
    return Response.json(
      {
        error: 'Failed to add inventory item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory
 * Get all inventory items for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const category = searchParams.get('category');

    if (!shop_id) {
      return Response.json({ error: 'shop_id is required' }, { status: 400 });
    }

    const items = await inventoryService.getInventoryItems(parseInt(shop_id), {
      category: category || undefined,
      is_active: true,
    });

    // Calculate total inventory value
    const totalValue = await inventoryService.getTotalInventoryValue(parseInt(shop_id));

    return Response.json({
      success: true,
      items,
      totalValue,
      count: items.length,
    });
  } catch (error) {
    routeLogger.error('Failed to fetch inventory items', error);
    return Response.json(
      {
        error: 'Failed to fetch inventory items',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory
 * Update an inventory item
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: 'Inventory item ID is required' },
        { status: 400 }
      );
    }

    const item = await inventoryService.updateInventoryItem(id, updates);

    return Response.json({
      success: true,
      message: 'Inventory item updated',
      item,
    });
  } catch (error) {
    routeLogger.error('Failed to update inventory item', error);
    return Response.json(
      {
        error: 'Failed to update inventory item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
