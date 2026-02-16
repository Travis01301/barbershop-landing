import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Webhook Logs API
 * - GET: Retrieve webhook delivery logs
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.webhooks.logs.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const webhookId = searchParams.get('webhookId')
    const eventType = searchParams.get('eventType')
    const isDelivered = searchParams.get('isDelivered')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching webhook logs', { shopId, webhookId, eventType, isDelivered })

    const client = await getClient()

    try {
      let query = `
        SELECT 
          wl.id, wl.event_type, wl.http_status_code,
          wl.response_body, wl.error_message,
          wl.sent_at, wl.delivered_at, wl.is_delivered,
          wl.attempt_number,
          w.webhook_url
        FROM webhook_logs wl
        JOIN webhooks w ON wl.webhook_id = w.id
        WHERE wl.shop_id = $1
      `
      const params: any[] = [parseInt(shopId)]
      let paramIndex = 2

      if (webhookId) {
        query += ` AND wl.webhook_id = $${paramIndex}`
        params.push(parseInt(webhookId))
        paramIndex++
      }

      if (eventType) {
        query += ` AND wl.event_type = $${paramIndex}`
        params.push(eventType)
        paramIndex++
      }

      if (isDelivered !== null) {
        query += ` AND wl.is_delivered = $${paramIndex}`
        params.push(isDelivered === 'true')
        paramIndex++
      }

      query += ` ORDER BY wl.sent_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(parseInt(limit), parseInt(offset))

      const logsRes = await client.query(query, params)

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM webhook_logs WHERE shop_id = $1'
      const countParams: any[] = [parseInt(shopId)]

      if (webhookId) {
        countQuery += ` AND webhook_id = $${countParams.length + 1}`
        countParams.push(parseInt(webhookId))
      }

      if (eventType) {
        countQuery += ` AND event_type = $${countParams.length + 1}`
        countParams.push(eventType)
      }

      if (isDelivered !== null) {
        countQuery += ` AND is_delivered = $${countParams.length + 1}`
        countParams.push(isDelivered === 'true')
      }

      const countRes = await client.query(countQuery, countParams)
      const totalCount = parseInt(countRes.rows[0].count)

      routeLogger.debug('Webhook logs retrieved', { count: logsRes.rows.length, total: totalCount })

      return Response.json({
        success: true,
        logs: logsRes.rows.map((row: any) => ({
          id: row.id,
          eventType: row.event_type,
          webhookUrl: row.webhook_url,
          httpStatusCode: row.http_status_code,
          responseBody: row.response_body,
          errorMessage: row.error_message,
          attemptNumber: row.attempt_number,
          isDelivered: row.is_delivered,
          sentAt: row.sent_at,
          deliveredAt: row.delivered_at,
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < totalCount,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Webhook logs fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch logs', details: (error as Error).message },
      { status: 500 }
    )
  }
}
