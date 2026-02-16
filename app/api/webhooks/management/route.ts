import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * Webhooks Management API
 * - GET: List all webhooks for a shop
 * - POST: Create a new webhook
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.webhooks.management.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const isActive = searchParams.get('isActive')

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching webhooks', { shopId, isActive })

    const client = await getClient()

    try {
      let query = 'SELECT id, webhook_url, events, is_active, retry_enabled, created_at FROM webhooks WHERE shop_id = $1'
      const params: any[] = [parseInt(shopId)]

      if (isActive !== null) {
        query += ` AND is_active = $2`
        params.push(isActive === 'true')
      }

      query += ' ORDER BY created_at DESC'

      const webhooksRes = await client.query(query, params)

      routeLogger.debug('Webhooks retrieved', { count: webhooksRes.rows.length })

      return Response.json({
        success: true,
        webhooks: webhooksRes.rows.map((row: any) => ({
          id: row.id,
          url: row.webhook_url,
          events: row.events,
          isActive: row.is_active,
          retryEnabled: row.retry_enabled,
          createdAt: row.created_at,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Webhooks fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch webhooks', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.webhooks.management.POST')

  try {
    const body = await request.json()
    const { shopId, webhookUrl, events, maxRetries = 5, retryBackoffSeconds = 30, headers = {} } = body

    if (!shopId || !webhookUrl || !events || events.length === 0) {
      routeLogger.warn('Missing required fields', { shopId, webhookUrl, events })
      return Response.json(
        { error: 'Shop ID, webhook URL, and events array are required' },
        { status: 400 }
      )
    }

    routeLogger.debug('Creating webhook', { shopId, webhookUrl, events })

    // Validate URL
    try {
      new URL(webhookUrl)
    } catch {
      routeLogger.warn('Invalid webhook URL', { webhookUrl })
      return Response.json({ error: 'Invalid webhook URL' }, { status: 400 })
    }

    const client = await getClient()

    try {
      // Generate webhook secret
      const webhookSecret = crypto.randomBytes(32).toString('hex')

      const webhookRes = await client.query(
        `INSERT INTO webhooks (
          shop_id, webhook_url, webhook_secret, events,
          max_retries, retry_backoff_seconds, headers, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, webhook_url, events, created_at`,
        [
          parseInt(shopId),
          webhookUrl,
          webhookSecret,
          events,
          maxRetries,
          retryBackoffSeconds,
          JSON.stringify(headers),
          1, // TODO: Get actual user ID from auth
        ]
      )

      const webhook = webhookRes.rows[0]

      routeLogger.info('Webhook created', {
        webhookId: webhook.id,
        shopId,
        events,
      })

      return Response.json({
        success: true,
        message: 'Webhook created successfully',
        webhook: {
          id: webhook.id,
          url: webhook.webhook_url,
          events: webhook.events,
          secret: webhookSecret, // Only returned once
          createdAt: webhook.created_at,
        },
      }, { status: 201 })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Webhook creation error:', error)
    return Response.json(
      { error: 'Failed to create webhook', details: (error as Error).message },
      { status: 500 }
    )
  }
}
