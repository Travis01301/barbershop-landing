import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * OAuth Integration API
 * - GET: Get OAuth connection status
 * - POST: Save OAuth token after callback
 * - DELETE: Remove OAuth connection
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.integrations.oauth.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const provider = searchParams.get('provider')

    if (!shopId || !provider) {
      return Response.json(
        { error: 'Shop ID and provider are required' },
        { status: 400 }
      )
    }

    routeLogger.debug('Fetching OAuth connection', { shopId, provider })

    const client = await getClient()

    try {
      const connRes = await client.query(
        `SELECT id, provider, token_expires_at, scope
         FROM oauth_connections
         WHERE shop_id = $1 AND provider = $2`,
        [parseInt(shopId), provider]
      )

      if (connRes.rows.length === 0) {
        return Response.json({
          success: true,
          connected: false,
          provider,
        })
      }

      const conn = connRes.rows[0]
      const isExpired = new Date(conn.token_expires_at) < new Date()

      return Response.json({
        success: true,
        connected: true,
        provider,
        isExpired,
        expiresAt: conn.token_expires_at,
        scope: conn.scope,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('OAuth connection fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch OAuth connection', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.integrations.oauth.POST')

  try {
    const body = await request.json()
    const { shopId, provider, providerUserId, accessToken, refreshToken, expiresAt, scope } = body

    if (!shopId || !provider || !providerUserId || !accessToken) {
      return Response.json(
        { error: 'Shop ID, provider, provider user ID, and access token are required' },
        { status: 400 }
      )
    }

    routeLogger.debug('Saving OAuth connection', { shopId, provider })

    const client = await getClient()

    try {
      // Upsert OAuth connection
      const connRes = await client.query(
        `INSERT INTO oauth_connections (
          shop_id, provider, provider_user_id, access_token,
          refresh_token, token_expires_at, scope
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (shop_id, provider) DO UPDATE SET
           provider_user_id = EXCLUDED.provider_user_id,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_expires_at = EXCLUDED.token_expires_at,
           scope = EXCLUDED.scope,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, created_at`,
        [
          parseInt(shopId),
          provider,
          providerUserId,
          accessToken,
          refreshToken || null,
          expiresAt || null,
          scope || null,
        ]
      )

      const conn = connRes.rows[0]

      routeLogger.info('OAuth connection saved', {
        provider,
        shopId,
      })

      return Response.json({
        success: true,
        message: 'OAuth connection saved successfully',
        connection: {
          id: conn.id,
          provider,
          providerUserId,
          createdAt: conn.created_at,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('OAuth save error:', error)
    return Response.json(
      { error: 'Failed to save OAuth connection', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const routeLogger = logger.createChild('api.integrations.oauth.DELETE')

  try {
    const body = await request.json()
    const { shopId, provider } = body

    if (!shopId || !provider) {
      return Response.json(
        { error: 'Shop ID and provider are required' },
        { status: 400 }
      )
    }

    routeLogger.debug('Deleting OAuth connection', { shopId, provider })

    const client = await getClient()

    try {
      const result = await client.query(
        'DELETE FROM oauth_connections WHERE shop_id = $1 AND provider = $2',
        [parseInt(shopId), provider]
      )

      if (result.rowCount === 0) {
        return Response.json(
          { error: 'OAuth connection not found' },
          { status: 404 }
        )
      }

      routeLogger.info('OAuth connection deleted', { shopId, provider })

      return Response.json({
        success: true,
        message: 'OAuth connection removed successfully',
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('OAuth delete error:', error)
    return Response.json(
      { error: 'Failed to delete OAuth connection', details: (error as Error).message },
      { status: 500 }
    )
  }
}
