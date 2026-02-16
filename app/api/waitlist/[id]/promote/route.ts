import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  PromoteWaitlistSchema,
  PromoteWaitlistInput,
} from '@/lib/recurring-validation';
import * as waitlistService from '@/lib/waitlist-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.waitlist.[id].promote');

/**
 * POST /api/waitlist/[id]/promote - Promote customer from waitlist to appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const waitlistId = parseInt(params.id);

    const validation = validateInput<PromoteWaitlistInput>(
      PromoteWaitlistSchema,
      {
        waitlistId,
        shopId: decoded.shopId,
        ...body,
      },
      'waitlist.promote'
    );

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const promoted = await waitlistService.promoteFromWaitlist(
      waitlistId,
      decoded.shopId,
      validation.data.appointmentId
    );

    if (!promoted) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    routeLogger.info('Customer promoted from waitlist', { waitlistId });
    return NextResponse.json({ success: true, entry: promoted });
  } catch (error) {
    routeLogger.error('Error promoting from waitlist', error);
    return NextResponse.json({ error: 'Failed to promote from waitlist' }, { status: 500 });
  }
}
