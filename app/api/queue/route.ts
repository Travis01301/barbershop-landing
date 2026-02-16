import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import * as queueService from '@/lib/queue-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.queue');

/**
 * POST /api/queue/check-in - Check in a walk-in customer
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

    const { customerName, customerPhone, serviceType, estimatedDuration, customerId } = body;

    if (!customerName || !serviceType) {
      return NextResponse.json(
        { error: 'Customer name and service type are required' },
        { status: 400 }
      );
    }

    const entry = await queueService.checkInCustomer(
      decoded.shopId,
      customerName,
      customerPhone,
      serviceType,
      estimatedDuration,
      customerId
    );

    routeLogger.info('Customer checked in', { customerId: entry.id });
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    routeLogger.error('Error checking in customer', error);
    return NextResponse.json({ error: 'Failed to check in customer' }, { status: 500 });
  }
}

/**
 * GET /api/queue/status - Get current queue status
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

    const status = await queueService.getQueueStatus(decoded.shopId);

    routeLogger.info('Queue status retrieved', { waiting: status.total_waiting });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    routeLogger.error('Error getting queue status', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
