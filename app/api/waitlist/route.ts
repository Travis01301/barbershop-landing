import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  JoinWaitlistSchema,
  JoinWaitlistInput,
} from '@/lib/recurring-validation';
import * as waitlistService from '@/lib/waitlist-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.waitlist');

/**
 * POST /api/waitlist - Join waitlist
 */
export async function POST(request: NextRequest) {
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

    const validation = validateInput<JoinWaitlistInput>(
      JoinWaitlistSchema,
      body,
      'waitlist.join'
    );

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const entry = await waitlistService.joinWaitlist({
      ...validation.data,
      shopId: decoded.shopId,
    });

    routeLogger.info('Customer joined waitlist', { customerId: validation.data.customerId });
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    routeLogger.error('Error joining waitlist', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

/**
 * GET /api/waitlist?barberId={id}&date={date} - Get waitlist for barber
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');
    const date = searchParams.get('date');

    if (!barberId) {
      return NextResponse.json({ error: 'barberId required' }, { status: 400 });
    }

    const waitlist = await waitlistService.getWaitlistForBarber(
      parseInt(barberId),
      decoded.shopId,
      date || undefined
    );

    routeLogger.info('Waitlist fetched', { count: waitlist.length });
    return NextResponse.json({ success: true, waitlist });
  } catch (error) {
    routeLogger.error('Error fetching waitlist', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
  }
}
