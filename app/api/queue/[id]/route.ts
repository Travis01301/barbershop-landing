import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import * as queueService from '@/lib/queue-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.queue.id');

/**
 * POST /api/queue/[id]/assign - Assign customer to barber
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
    const { action, barberId } = body;

    if (action === 'assign' && barberId) {
      const entry = await queueService.assignCustomerToBarber(id, barberId);
      routeLogger.info('Customer assigned to barber', { queueId: id, barberId });
      return NextResponse.json({ success: true, entry });
    } else if (action === 'complete') {
      const entry = await queueService.completeService(id);
      routeLogger.info('Service completed', { queueId: id });
      return NextResponse.json({ success: true, entry });
    } else if (action === 'no-show') {
      const entry = await queueService.markAsNoShow(id);
      routeLogger.info('Customer marked as no-show', { queueId: id });
      return NextResponse.json({ success: true, entry });
    } else if (action === 'cancel') {
      const entry = await queueService.cancelQueueEntry(id);
      routeLogger.info('Queue entry cancelled', { queueId: id });
      return NextResponse.json({ success: true, entry });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    routeLogger.error('Error processing queue action', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}

/**
 * DELETE /api/queue/[id] - Delete/cancel queue entry
 */
export async function DELETE(
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

    const entry = await queueService.cancelQueueEntry(id);

    routeLogger.info('Queue entry deleted', { queueId: id });
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    routeLogger.error('Error deleting queue entry', error);
    return NextResponse.json({ error: 'Failed to delete queue entry' }, { status: 500 });
  }
}
