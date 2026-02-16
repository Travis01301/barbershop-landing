import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { smsMarketingService } from '@/lib/sms-marketing-service';

const routeLogger = logger.createChild('api.sms.campaigns');

/**
 * POST /api/sms/campaigns
 * Create a new SMS campaign
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shop_id,
      campaign_name,
      campaign_type,
      message_content,
      scheduled_time,
      send_now,
      sender_id,
      created_by,
    } = body;

    if (!shop_id || !campaign_name || !campaign_type || !message_content) {
      return Response.json(
        {
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const campaign = await smsMarketingService.createCampaign(
      shop_id,
      campaign_name,
      campaign_type,
      message_content,
      {
        scheduled_time: scheduled_time ? new Date(scheduled_time) : undefined,
        send_now,
        sender_id,
        created_by,
      }
    );

    return Response.json(
      {
        success: true,
        message: 'SMS campaign created',
        campaign,
      },
      { status: 201 }
    );
  } catch (error) {
    routeLogger.error('Failed to create SMS campaign', error);
    return Response.json(
      {
        error: 'Failed to create SMS campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sms/campaigns
 * Get all campaigns for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const status = searchParams.get('status');

    if (!shop_id) {
      return Response.json({ error: 'shop_id is required' }, { status: 400 });
    }

    const campaigns = await smsMarketingService.getCampaigns(parseInt(shop_id), {
      status: status || undefined,
    });

    return Response.json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    routeLogger.error('Failed to fetch SMS campaigns', error);
    return Response.json(
      {
        error: 'Failed to fetch SMS campaigns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sms/campaigns
 * Update a campaign
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const campaign = await smsMarketingService.updateCampaign(id, updates);

    return Response.json({
      success: true,
      message: 'Campaign updated',
      campaign,
    });
  } catch (error) {
    routeLogger.error('Failed to update SMS campaign', error);
    return Response.json(
      {
        error: 'Failed to update SMS campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
