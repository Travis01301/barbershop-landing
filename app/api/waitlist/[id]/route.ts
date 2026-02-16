import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  UpdateWaitlistPrioritySchema,
  PromoteWaitlistSchema,
  UpdateWaitlistPriorityInput,
  PromoteWaitlistInput,
} from '@/lib/recurring-validation';
import * as waitlistService from '@/lib/waitlist-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.waitlist.[id]');

/**
 * PATCH /api/waitlist/[id]/priority - Update waitlist priority
 */
export async function PATCH(
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
    const id = parseInt(params.id);

    const validation = validateInput<UpdateWaitlistPriorityInput>(
      UpdateWaitlistPrioritySchema,
      { id, shopId: decoded.shopId, ...body },
      'waitlist.updatePriority'
    );

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const updated = await waitlistService.updateWaitlistPriority(
      id,
      decoded.shopId,
      validation.data.priorityLevel,
      validation.data.priorityFeeCharged
    );

    if (!updated) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    routeLogger.info('Waitlist priority updated', { id });
    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    routeLogger.error('Error updating waitlist priority', error);
    return NextResponse.json({ error: 'Failed to update waitlist priority' }, { status: 500 });
  }
}

/**
 * DELETE /api/waitlist/[id] - Cancel waitlist entry
 */
export async function DELETE(
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

    const id = parseInt(params.id);
    const cancelled = await waitlistService.cancelWaitlistEntry(id, decoded.shopId);

    if (!cancelled) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    routeLogger.info('Waitlist entry cancelled', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error('Error cancelling waitlist entry', error);
    return NextResponse.json({ error: 'Failed to cancel waitlist entry' }, { status: 500 });
  }
}
