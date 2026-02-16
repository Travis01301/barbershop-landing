import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { validateInput } from '@/lib/validation';
import { logger } from '@/lib/logger';
import {
  CreateRecurringAppointmentSchema,
  CreateRecurringAppointmentInput,
} from '@/lib/recurring-validation';
import * as recurringService from '@/lib/recurring-service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const routeLogger = logger.createChild('api.recurring');

/**
 * POST /api/recurring - Create a new recurring appointment
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

    const validation = validateInput<CreateRecurringAppointmentInput>(
      CreateRecurringAppointmentSchema,
      body,
      'recurring.create'
    );

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const recurring = await recurringService.createRecurringAppointment({
      ...validation.data,
      shopId: decoded.shopId,
    });

    routeLogger.info('Recurring appointment created', { id: recurring?.id });
    return NextResponse.json({ success: true, recurring }, { status: 201 });
  } catch (error) {
    routeLogger.error('Error creating recurring appointment', error);
    return NextResponse.json({ error: 'Failed to create recurring appointment' }, { status: 500 });
  }
}

/**
 * GET /api/recurring - List recurring appointments for customer
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
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId required' }, { status: 400 });
    }

    const recurring = await recurringService.getRecurringAppointments(
      parseInt(customerId),
      decoded.shopId
    );

    routeLogger.info('Recurring appointments fetched', { count: recurring.length });
    return NextResponse.json({ success: true, recurring });
  } catch (error) {
    routeLogger.error('Error fetching recurring appointments', error);
    return NextResponse.json({ error: 'Failed to fetch recurring appointments' }, { status: 500 });
  }
}
