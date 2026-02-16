import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import * as campaignService from '@/lib/campaign-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.campaigns.analytics');

/**
 * GET /api/campaigns/[id]/analytics - Get campaign analytics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { shopId: string; userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const analytics = await campaignService.getCampaignAnalytics(id);

    routeLogger.info('Campaign analytics retrieved', { campaignId: id });
    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    routeLogger.error('Error getting campaign analytics', error);
    return NextResponse.json({ error: 'Failed to get campaign analytics' }, { status: 500 });
  }
}
