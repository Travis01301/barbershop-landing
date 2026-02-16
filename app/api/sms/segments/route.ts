import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { smsMarketingService } from '@/lib/sms-marketing-service';

const routeLogger = logger.createChild('api.sms.segments');

/**
 * POST /api/sms/segments
 * Create a customer segment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shop_id,
      segment_name,
      segment_type,
      criteria,
    } = body;

    if (!shop_id || !segment_name || !segment_type || !criteria) {
      return Response.json(
        {
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const segment = await smsMarketingService.createSegment(
      shop_id,
      segment_name,
      segment_type,
      criteria
    );

    return Response.json(
      {
        success: true,
        message: 'Segment created',
        segment,
      },
      { status: 201 }
    );
  } catch (error) {
    routeLogger.error('Failed to create SMS segment', error);
    return Response.json(
      {
        error: 'Failed to create SMS segment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sms/segments
 * Get all segments for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');

    if (!shop_id) {
      return Response.json({ error: 'shop_id is required' }, { status: 400 });
    }

    const segments = await smsMarketingService.getSegments(parseInt(shop_id));

    return Response.json({
      success: true,
      segments,
      count: segments.length,
    });
  } catch (error) {
    routeLogger.error('Failed to fetch SMS segments', error);
    return Response.json(
      {
        error: 'Failed to fetch SMS segments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
