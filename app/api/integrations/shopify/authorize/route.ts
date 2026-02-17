import { NextRequest, NextResponse } from 'next/server';
import { ShopifyIntegration } from '@/lib/integrations/shopify-service';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { organizationId, code, shop, state } = await request.json();

    if (!organizationId || !code || !shop) {
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

    // Verify HMAC (security check)
    const hmac = state; // In production, extract from request query
    const message = `code=${code}&shop=${shop}`;
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET || '')
      .update(message)
      .digest('base64');

    if (hash !== hmac) {
      return NextResponse.json(
        { error: 'Invalid HMAC' },
        { status: 401 }
      );
    }

    const shopify = new ShopifyIntegration({
      clientId: process.env.SHOPIFY_CLIENT_ID || '',
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
      redirectUri: process.env.SHOPIFY_REDIRECT_URI || '',
    });

    const tokenResponse = await shopify.exchangeCodeForToken(code, shop);

    // Register webhooks
    try {
      await shopify.registerWebhook(
        tokenResponse.accessToken,
        shop,
        'orders/created',
        `${process.env.SHOPIFY_REDIRECT_URI}/webhooks/orders/created`
      );
      await shopify.registerWebhook(
        tokenResponse.accessToken,
        shop,
        'orders/updated',
        `${process.env.SHOPIFY_REDIRECT_URI}/webhooks/orders/updated`
      );
    } catch (webhookError) {
      console.error('Webhook registration failed:', webhookError);
      // Don't fail authorization if webhooks fail
    }

    const connection = await prisma.oAuthConnection.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId,
          provider: 'SHOPIFY',
          externalId: shop,
        },
      },
      update: {
        accessToken: tokenResponse.accessToken,
        tokenExpiresAt: tokenResponse.expiresAt,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        provider: 'SHOPIFY',
        accessToken: tokenResponse.accessToken,
        tokenExpiresAt: tokenResponse.expiresAt,
        externalId: shop,
        status: 'CONNECTED',
        lastSyncedAt: new Date(),
      },
    });

    await prisma.integrationLog.create({
      data: {
        organizationId,
        provider: 'SHOPIFY',
        action: 'authorize',
        status: 'success',
        details: JSON.stringify({
          shop,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      shop,
      message: 'Shopify POS integration authorized successfully',
    });
  } catch (error) {
    console.error('Shopify authorization error:', error);
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
      provider: 'SHOPIFY',
    },
  });

  return NextResponse.json({
    connected: connection?.status === 'CONNECTED',
    shop: connection?.externalId || null,
    lastSyncedAt: connection?.lastSyncedAt || null,
  });
}
