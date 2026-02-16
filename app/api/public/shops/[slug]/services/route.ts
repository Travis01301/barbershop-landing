import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.createChild('api.public.services');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Validate shop exists and is portal-enabled
    const shopResult = await query(
      'SELECT id FROM shops WHERE portal_slug = $1 AND portal_enabled = true',
      [slug]
    );

    if (shopResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shop not found or portal not enabled' },
        { status: 404 }
      );
    }

    const shopId = shopResult.rows[0].id;

    // Get all services
    const servicesResult = await query(
      `SELECT 
        id,
        name,
        description,
        price_cents,
        duration_minutes,
        is_active,
        category,
        commission_cents
      FROM barber_services
      WHERE shop_id = $1 AND is_active = true
      ORDER BY name ASC`,
      [shopId]
    );

    // Get add-ons for each service
    const services = await Promise.all(
      servicesResult.rows.map(async (service) => {
        const addOnsResult = await query(
          `SELECT id, name, description, price_cents, duration_minutes
           FROM service_add_ons
           WHERE service_id = $1 AND is_active = true
           ORDER BY display_order, name ASC`,
          [service.id]
        );

        return {
          ...service,
          price: service.price_cents / 100,
          commission: service.commission_cents / 100,
          addOns: addOnsResult.rows.map(addon => ({
            ...addon,
            price: addon.price_cents / 100,
          })),
        };
      })
    );

    log.info('Services list retrieved', {
      shopId,
      count: services.length,
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    log.error('Failed to get services', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get services' },
      { status: 500 }
    );
  }
}
