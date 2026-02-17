import { NextRequest, NextResponse } from 'next/server';
import { ZapierIntegration } from '@/lib/integrations/zapier-service';
import { PrismaClient } from '@prisma/client';
import { OAuthStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { organizationId, code, state } = await request.json();

    if (!organizationId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const zapier = new ZapierIntegration({
      clientId: process.env.ZAPIER_CLIENT_ID || '',
      clientSecret: process.env.ZAPIER_CLIENT_SECRET || '',
      redirectUri: process.env.ZAPIER_REDIRECT_URI || '',
    });

    const tokenResponse = await zapier.exchangeCodeForToken(code);

    // Store or update OAuth connection
    const connection = await prisma.oAuthConnection.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId,
          provider: 'ZAPIER',
          externalId: 'zapier-app', // Zapier doesn't provide a user ID, use static
        },
      },
      update: {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        status: 'CONNECTED' as OAuthStatus,
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        provider: 'ZAPIER',
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || '',
        tokenExpiresAt: tokenResponse.expiresAt,
        externalId: 'zapier-app',
        status: 'CONNECTED' as OAuthStatus,
        lastSyncedAt: new Date(),
      },
    });

    // Log integration event
    await prisma.integrationLog.create({
      data: {
        organizationId,
        provider: 'ZAPIER',
        action: 'authorize',
        status: 'success',
        details: JSON.stringify({
          externalId: connection.externalId,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      message: 'Zapier integration authorized successfully',
    });
  } catch (error) {
    console.error('Zapier authorization error:', error);

    await prisma.integrationLog.create({
      data: {
        organizationId: (await request.json()).organizationId || 'unknown',
        provider: 'ZAPIER',
        action: 'authorize',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => {}); // Silently fail if org doesn't exist

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
      provider: 'ZAPIER',
    },
  });

  if (!connection) {
    return NextResponse.json(
      { connected: false, message: 'No Zapier connection found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    connected: connection.status === 'CONNECTED',
    externalId: connection.externalId,
    lastSyncedAt: connection.lastSyncedAt,
  });
}
