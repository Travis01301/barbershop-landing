import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Verify Shopify webhook signature
function verifyShopifyWebhook(request: NextRequest, body: string): boolean {
  const hmacHeader = request.headers.get('x-shopify-hmac-SHA256');
  if (!hmacHeader) return false;

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET || '')
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature
    if (!verifyShopifyWebhook(request, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const order = JSON.parse(body) as any;

    // Get shop domain from headers
    const shop = request.headers.get('x-shopify-shop-api-call-limit') ? null : null;

    // Find organization with this Shopify connection
    const connection = await prisma.oAuthConnection.findFirst({
      where: {
        provider: 'SHOPIFY',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Shopify connection not found' },
        { status: 404 }
      );
    }

    // Log the order event
    await prisma.integrationLog.create({
      data: {
        organizationId: connection.organizationId,
        provider: 'SHOPIFY',
        action: 'order_created',
        status: 'success',
        details: JSON.stringify({
          orderId: order.id,
          orderNumber: order.order_number,
          totalPrice: order.total_price,
          customerEmail: order.customer?.email,
          lineItems: order.line_items.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // TODO: In production, trigger appointment creation or revenue tracking
    // For now, just log the event

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
