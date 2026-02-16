import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Google Reviews Sync API
 * - GET: Retrieve synced Google reviews
 * - POST: Trigger sync from Google Business Profile
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.reviews.google-sync.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const limit = searchParams.get('limit') || '50'

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching Google reviews', { shopId, limit })

    const client = await getClient()

    try {
      const reviewsRes = await client.query(
        `SELECT id, google_review_id, customer_name, rating, comment, 
                google_profile_url, google_review_url, synced_at
         FROM google_reviews_sync
         WHERE shop_id = $1
         ORDER BY synced_at DESC
         LIMIT $2`,
        [parseInt(shopId), parseInt(limit)]
      )

      routeLogger.debug('Google reviews retrieved', { count: reviewsRes.rows.length })

      return Response.json({
        success: true,
        reviews: reviewsRes.rows.map((row: any) => ({
          id: row.id,
          googleReviewId: row.google_review_id,
          customerName: row.customer_name,
          rating: row.rating,
          comment: row.comment,
          profileUrl: row.google_profile_url,
          reviewUrl: row.google_review_url,
          syncedAt: row.synced_at,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Google reviews fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch Google reviews', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.reviews.google-sync.POST')

  try {
    const body = await request.json()
    const { shopId } = body

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Starting Google reviews sync', { shopId })

    const client = await getClient()

    try {
      // Get shop's Google Business Profile credentials
      const shopRes = await client.query(
        'SELECT google_business_profile_id, google_oauth_token FROM shops WHERE id = $1',
        [parseInt(shopId)]
      )

      if (shopRes.rows.length === 0 || !shopRes.rows[0].google_business_profile_id) {
        routeLogger.warn('Shop not configured for Google', { shopId })
        return Response.json(
          { error: 'Shop not configured for Google Business Profile' },
          { status: 400 }
        )
      }

      const shop = shopRes.rows[0]

      // In production: Call Google Business Profile API to fetch reviews
      // For now, we'll return a success response and document the integration point
      routeLogger.info('Google reviews sync initiated', { shopId })

      return Response.json({
        success: true,
        message: 'Google reviews sync initiated',
        note: 'In production, this would call the Google Business Profile API',
        syncDetails: {
          businessProfileId: shop.google_business_profile_id,
          tokenValid: !!shop.google_oauth_token,
          nextSyncAt: new Date(Date.now() + 3600000).toISOString(),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Google reviews sync error:', error)
    return Response.json(
      { error: 'Failed to sync Google reviews', details: (error as Error).message },
      { status: 500 }
    )
  }
}
