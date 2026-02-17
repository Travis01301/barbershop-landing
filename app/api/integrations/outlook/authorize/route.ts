import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarIntegration } from '@/lib/integrations/outlook-calendar-service';
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

    const outlook = new OutlookCalendarIntegration({
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
    });

    const tokenResponse = await outlook.exchangeCodeForToken(code);

    // Get user info to store email
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
    });

    const userInfo = (await userInfoResponse.json()) as any;

    const connection = await prisma.oAuthConnection.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId,
          provider: 'OUTLOOK_CALENDAR',
          externalId: userInfo.id,
        },
      },
      update: {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        externalEmail: userInfo.mail || userInfo.userPrincipalName,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        provider: 'OUTLOOK_CALENDAR',
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        externalId: userInfo.id,
        externalEmail: userInfo.mail || userInfo.userPrincipalName,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
    });

    await prisma.integrationLog.create({
      data: {
        organizationId,
        provider: 'OUTLOOK_CALENDAR',
        action: 'authorize',
        status: 'success',
        details: JSON.stringify({
          email: userInfo.mail || userInfo.userPrincipalName,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      email: userInfo.mail || userInfo.userPrincipalName,
      message: 'Outlook Calendar integration authorized successfully',
    });
  } catch (error) {
    console.error('Outlook Calendar authorization error:', error);
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
      provider: 'OUTLOOK_CALENDAR',
    },
  });

  return NextResponse.json({
    connected: connection?.status === 'CONNECTED',
    email: connection?.externalEmail || null,
    lastSyncedAt: connection?.lastSyncedAt || null,
  });
}
