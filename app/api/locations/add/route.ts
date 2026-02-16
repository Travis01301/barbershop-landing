import { NextRequest, NextResponse } from 'next/server';
import multiLocationService from '@/lib/multi-location-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/locations/add');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, address, phone, email, parentShopId } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      );
    }

    const location = await multiLocationService.createLocation({
      name,
      slug,
      address,
      phone,
      email,
      parentShopId,
    });

    log.info('Location created', { locationId: location.id, name });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    log.error('Failed to create location', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create location' },
      { status: 500 }
    );
  }
}
