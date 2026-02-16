import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { smsMarketingService } from '@/lib/sms-marketing-service';

const routeLogger = logger.createChild('api.sms.campaigns.send');

/**
 * POST /api/sms/campaigns/send
 * Send a campaign to selected segments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_id,
      segment_ids,
      twilio_from_number,
    } = body;

    if (!campaign_id || !segment_ids || !Array.isArray(segment_ids) || segment_ids.length === 0) {
      return Response.json(
        {
          error: 'Missing or invalid required fields (campaign_id and segment_ids required)',
        },
        { status: 400 }
      );
    }

    if (!twilio_from_number) {
      return Response.json(
        {
          error: 'Twilio phone number is required',
        },
        { status: 400 }
      );
    }

    const result = await smsMarketingService.sendCampaign(
      campaign_id,
      segment_ids,
      twilio_from_number
    );

    return Response.json(
      {
        success: true,
        message: 'Campaign sent',
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    routeLogger.error('Failed to send SMS campaign', error);
    return Response.json(
      {
        error: 'Failed to send SMS campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
