import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * API Keys Management API
 * - GET: List all API keys for a shop
 * - POST: Create a new API key
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.api-keys.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching API keys', { shopId })

    const client = await getClient()

    try {
      const keysRes = await client.query(
        `SELECT id, key_name, key_hash, rate_limit, is_active, last_used_at, expires_at, created_at
         FROM api_keys
         WHERE shop_id = $1
         ORDER BY created_at DESC`,
        [parseInt(shopId)]
      )

      routeLogger.debug('API keys retrieved', { count: keysRes.rows.length })

      return Response.json({
        success: true,
        apiKeys: keysRes.rows.map((row: any) => ({
          id: row.id,
          name: row.key_name,
          keyHash: row.key_hash, // Don't return full key
          rateLimit: row.rate_limit,
          isActive: row.is_active,
          lastUsedAt: row.last_used_at,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('API keys fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch API keys', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.api-keys.POST')

  try {
    const body = await request.json()
    const { shopId, keyName, rateLimit = 1000, expiresAt } = body

    if (!shopId || !keyName) {
      routeLogger.warn('Missing required fields', { shopId, keyName })
      return Response.json(
        { error: 'Shop ID and key name are required' },
        { status: 400 }
      )
    }

    routeLogger.debug('Creating API key', { shopId, keyName })

    const client = await getClient()

    try {
      // Generate API key and secret
      const apiKey = `sk_${crypto.randomBytes(24).toString('hex')}`
      const apiSecret = crypto.randomBytes(32).toString('hex')
      const keyHash = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex')

      const keyRes = await client.query(
        `INSERT INTO api_keys (
          shop_id, key_name, api_key, api_secret, key_hash,
          rate_limit, expires_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at`,
        [
          parseInt(shopId),
          keyName,
          apiKey,
          apiSecret,
          keyHash,
          rateLimit,
          expiresAt || null,
          1, // TODO: Get actual user ID from auth
        ]
      )

      const key = keyRes.rows[0]

      routeLogger.info('API key created', {
        keyId: key.id,
        shopId,
        keyName,
      })

      return Response.json({
        success: true,
        message: 'API key created successfully',
        apiKey: {
          id: key.id,
          key: apiKey, // Only returned once
          secret: apiSecret, // Only returned once
          name: keyName,
          rateLimit,
          createdAt: key.created_at,
          expiresAt,
        },
      }, { status: 201 })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('API key creation error:', error)
    return Response.json(
      { error: 'Failed to create API key', details: (error as Error).message },
      { status: 500 }
    )
  }
}
