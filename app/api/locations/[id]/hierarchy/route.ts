import { NextRequest, NextResponse } from 'next/server';
import multiLocationService from '@/lib/multi-location-service';
import { logger } from '@/lib/logger';

const log = logger.createChild('api/locations/[id]/hierarchy');

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shopId = parseInt(params.id);

    if (isNaN(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shop ID' },
        { status: 400 }
      );
    }

    const hierarchy = await multiLocationService.getLocationHierarchy(shopId);

    return NextResponse.json(hierarchy);
  } catch (error) {
    log.error('Failed to get location hierarchy', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get location hierarchy' },
      { status: 500 }
    );
  }
}
