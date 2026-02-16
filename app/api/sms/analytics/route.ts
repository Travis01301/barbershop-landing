import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { smsMarketingService } from '@/lib/sms-marketing-service';

const routeLogger = logger.createChild('api.sms.analytics');

/**
 * GET /api/sms/analytics
 * Get analytics for a campaign
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaign_id = searchParams.get('campaign_id');

    if (!campaign_id) {
      return Response.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const analytics = await smsMarketingService.getCampaignAnalytics(parseInt(campaign_id));

    return Response.json({
      success: true,
      analytics,
      count: analytics.length,
    });
  } catch (error) {
    routeLogger.error('Failed to fetch SMS analytics', error);
    return Response.json(
      {
        error: 'Failed to fetch SMS analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
