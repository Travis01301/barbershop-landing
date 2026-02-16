import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Review Reply/Response API
 * PATCH: Add a reply to a review
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.reviews.[id].reply.PATCH')

  try {
    const body = await request.json()
    const { shopId, barberId, responseText, responseType = 'custom', templateId } = body

    if (!shopId || !barberId || !responseText) {
      routeLogger.warn('Missing required fields', { shopId, barberId, responseText })
      return Response.json(
        { error: 'Shop ID, Barber ID, and response text are required' },
        { status: 400 }
      )
    }

    const reviewId = parseInt(params.id)
    routeLogger.debug('Processing review reply', { reviewId, shopId, barberId })

    const client = await getClient()

    try {
      // Verify review exists and belongs to this shop
      const reviewRes = await client.query(
        'SELECT id, barber_id FROM reviews WHERE id = $1 AND shop_id = $2',
        [reviewId, parseInt(shopId)]
      )

      if (reviewRes.rows.length === 0) {
        routeLogger.warn('Review not found', { reviewId, shopId })
        return Response.json({ error: 'Review not found' }, { status: 404 })
      }

      // Check if response already exists
      const existingRes = await client.query(
        'SELECT id FROM review_responses WHERE review_id = $1',
        [reviewId]
      )

      if (existingRes.rows.length > 0) {
        routeLogger.warn('Response already exists for this review', { reviewId })
        return Response.json(
          { error: 'Response already exists for this review' },
          { status: 400 }
        )
      }

      // Insert response
      const responseRes = await client.query(
        `INSERT INTO review_responses (
          shop_id, review_id, barber_id, response_text, response_type, template_id
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [parseInt(shopId), reviewId, parseInt(barberId), responseText, responseType, templateId || null]
      )

      const response = responseRes.rows[0]

      routeLogger.info('Review response added', {
        responseId: response.id,
        reviewId,
        barberId,
      })

      return Response.json({
        success: true,
        message: 'Response added successfully',
        response: {
          id: response.id,
          reviewId,
          responseText,
          createdAt: response.created_at,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Review reply error:', error)
    return Response.json(
      { error: 'Failed to add response', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.reviews.[id].reply.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    const reviewId = parseInt(params.id)
    routeLogger.debug('Fetching review response', { reviewId, shopId })

    const client = await getClient()

    try {
      const responseRes = await client.query(
        `SELECT rr.id, rr.response_text, rr.response_type, rr.template_id,
                rr.posted_to_google, rr.created_at,
                u.name as barber_name
         FROM review_responses rr
         JOIN users u ON rr.barber_id = u.id
         WHERE rr.review_id = $1 AND rr.shop_id = $2`,
        [reviewId, parseInt(shopId)]
      )

      if (responseRes.rows.length === 0) {
        return Response.json(
          { success: true, response: null },
          { status: 200 }
        )
      }

      const response = responseRes.rows[0]

      return Response.json({
        success: true,
        response: {
          id: response.id,
          reviewId,
          responseText: response.response_text,
          responseType: response.response_type,
          templateId: response.template_id,
          postedToGoogle: response.posted_to_google,
          barberName: response.barber_name,
          createdAt: response.created_at,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Review response fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch response', details: (error as Error).message },
      { status: 500 }
    )
  }
}
