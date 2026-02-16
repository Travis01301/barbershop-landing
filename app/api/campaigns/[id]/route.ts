import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import * as campaignService from '@/lib/campaign-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.campaigns.id');

/**
 * PUT /api/campaigns/[id] - Update a campaign
 */
export async function PUT(
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

    const body = await request.json();

    const campaign = await campaignService.updateCampaign(id, body);

    routeLogger.info('Campaign updated', { campaignId: id });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    routeLogger.error('Error updating campaign', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns/[id]/send - Send campaign
 */
export async function POST(
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

    const body = await request.json();
    const { recipientEmails } = body;

    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return NextResponse.json(
        { error: 'recipientEmails array is required' },
        { status: 400 }
      );
    }

    await campaignService.sendCampaign(id, recipientEmails);

    routeLogger.info('Campaign sent', { campaignId: id, count: recipientEmails.length });
    return NextResponse.json({ success: true, message: 'Campaign sent successfully' });
  } catch (error) {
    routeLogger.error('Error sending campaign', error);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
