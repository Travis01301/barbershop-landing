import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  UpdateRecurringAppointmentSchema,
  UpdateRecurringAppointmentInput,
} from '@/lib/recurring-validation';
import * as recurringService from '@/lib/recurring-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.recurring.[id]');

/**
 * PATCH /api/recurring/[id] - Update a recurring appointment
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

    const validation = validateInput<UpdateRecurringAppointmentInput>(
      UpdateRecurringAppointmentSchema,
      { id, shopId: decoded.shopId, ...body },
      'recurring.update'
    );

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const updated = await recurringService.updateRecurringAppointment(
      id,
      decoded.shopId,
      validation.data
    );

    if (!updated) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    routeLogger.info('Recurring appointment updated', { id });
    return NextResponse.json({ success: true, recurring: updated });
  } catch (error) {
    routeLogger.error('Error updating recurring appointment', error);
    return NextResponse.json({ error: 'Failed to update recurring appointment' }, { status: 500 });
  }
}

/**
 * DELETE /api/recurring/[id] - Delete (deactivate) a recurring appointment
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
    const deleted = await recurringService.deleteRecurringAppointment(id, decoded.shopId);

    if (!deleted) {
      return NextResponse.json({ error: 'Recurring appointment not found' }, { status: 404 });
    }

    routeLogger.info('Recurring appointment deleted', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error('Error deleting recurring appointment', error);
    return NextResponse.json({ error: 'Failed to delete recurring appointment' }, { status: 500 });
  }
}
