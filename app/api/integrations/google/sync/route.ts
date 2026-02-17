import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { organizationId, action, appointmentData } = await request.json();

    if (!organizationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connection = await prisma.oAuthConnection.findFirst({
      where: {
        organizationId,
        provider: 'GOOGLE_CALENDAR',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 404 }
      );
    }

    const google = new GoogleCalendarIntegration({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    });

    let result;

    switch (action) {
      case 'create':
        result = await google.createEvent(connection.accessToken, appointmentData);
        await prisma.integrationLog.create({
          data: {
            organizationId,
            provider: 'GOOGLE_CALENDAR',
            action: 'create_event',
            status: 'success',
            details: JSON.stringify({ eventId: result.id }),
          },
        });
        break;

      case 'delete':
        await google.deleteEvent(connection.accessToken, appointmentData.eventId);
        await prisma.integrationLog.create({
          data: {
            organizationId,
            provider: 'GOOGLE_CALENDAR',
            action: 'delete_event',
            status: 'success',
            details: JSON.stringify({ eventId: appointmentData.eventId }),
          },
        });
        break;

      case 'update':
        result = await google.updateEvent(
          connection.accessToken,
          appointmentData.eventId,
          appointmentData
        );
        await prisma.integrationLog.create({
          data: {
            organizationId,
            provider: 'GOOGLE_CALENDAR',
            action: 'update_event',
            status: 'success',
            details: JSON.stringify({ eventId: result.id }),
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update last synced time
    await prisma.oAuthConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      action,
      result: result || { success: true },
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Missing organizationId' },
      { status: 400 }
    );
  }

  const connection = await prisma.oAuthConnection.findFirst({
    where: {
      organizationId,
      provider: 'GOOGLE_CALENDAR',
    },
  });

  if (!connection) {
    return NextResponse.json({
      status: 'disconnected',
    });
  }

  return NextResponse.json({
    status: connection.status,
    lastSyncedAt: connection.lastSyncedAt,
    syncErrorMessage: connection.syncErrorMessage,
  });
}
