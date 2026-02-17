import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { organizationId, code } = await request.json();

    if (!organizationId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const google = new GoogleCalendarIntegration({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    });

    const tokenResponse = await google.exchangeCodeForToken(code);

    // Get user info to store email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
    });

    const userInfo = (await userInfoResponse.json()) as any;

    const connection = await prisma.oAuthConnection.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId,
          provider: 'GOOGLE_CALENDAR',
          externalId: userInfo.id,
        },
      },
      update: {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        externalEmail: userInfo.email,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        provider: 'GOOGLE_CALENDAR',
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        externalId: userInfo.id,
        externalEmail: userInfo.email,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
    });

    await prisma.integrationLog.create({
      data: {
        organizationId,
        provider: 'GOOGLE_CALENDAR',
        action: 'authorize',
        status: 'success',
        details: JSON.stringify({
          email: userInfo.email,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      email: userInfo.email,
      message: 'Google Calendar integration authorized successfully',
    });
  } catch (error) {
    console.error('Google Calendar authorization error:', error);
    return NextResponse.json(
      { error: 'Authorization failed' },
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

  return NextResponse.json({
    connected: connection?.status === 'CONNECTED',
    email: connection?.externalEmail || null,
    lastSyncedAt: connection?.lastSyncedAt || null,
  });
}
