import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import * as campaignService from '@/lib/campaign-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.campaigns');

/**
 * POST /api/campaigns/create - Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    const { name, campaign_type, subject, html_content, sender_email, ...rest } = body;

    if (!name || !campaign_type || !subject || !html_content || !sender_email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, campaign_type, subject, html_content, sender_email' },
        { status: 400 }
      );
    }

    const campaign = await campaignService.createCampaign(
      decoded.shopId,
      {
        name,
        campaign_type,
        subject,
        html_content,
        sender_email,
        ...rest,
      },
      decoded.userId
    );

    routeLogger.info('Campaign created', { campaignId: campaign.id });
    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    routeLogger.error('Error creating campaign', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

/**
 * GET /api/campaigns - Get campaigns for shop
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await campaignService.getCampaigns(decoded.shopId, status, limit, offset);

    routeLogger.info('Campaigns retrieved', { count: result.campaigns.length, total: result.total });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    routeLogger.error('Error getting campaigns', error);
    return NextResponse.json({ error: 'Failed to get campaigns' }, { status: 500 });
  }
}
