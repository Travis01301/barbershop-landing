import { NextRequest, NextResponse } from 'next/server';
import multiLocationService from '@/lib/multi-location-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/locations');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId') ? parseInt(searchParams.get('shopId')!) : undefined;
    const parentShopId = searchParams.get('parentShopId')
      ? parseInt(searchParams.get('parentShopId')!)
      : undefined;

    const locations = await multiLocationService.getLocations(shopId, parentShopId);

    return NextResponse.json(locations);
  } catch (error) {
    log.error('Failed to get locations', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get locations' },
      { status: 500 }
    );
  }
}
