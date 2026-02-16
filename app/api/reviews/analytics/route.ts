import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.reviews.analytics')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const barberId = searchParams.get('barberId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching review analytics', { shopId, barberId, startDate, endDate })

    const client = await getClient()

    try {
      let query = `
        SELECT 
          ra.metric_date,
          ra.total_reviews,
          ra.average_rating,
          ra.review_count_1_star,
          ra.review_count_2_star,
          ra.review_count_3_star,
          ra.review_count_4_star,
          ra.review_count_5_star,
          ra.response_rate,
          ra.sentiment_positive_count,
          ra.sentiment_negative_count,
          ra.sentiment_neutral_count,
          u.id as barber_id,
          u.name as barber_name
        FROM review_analytics ra
        LEFT JOIN users u ON ra.barber_id = u.id
        WHERE ra.shop_id = $1
      `
      const params: any[] = [parseInt(shopId)]
      let paramIndex = 2

      if (barberId) {
        query += ` AND ra.barber_id = $${paramIndex}`
        params.push(parseInt(barberId))
        paramIndex++
      }

      if (startDate) {
        query += ` AND ra.metric_date >= $${paramIndex}`
        params.push(new Date(startDate).toISOString().split('T')[0])
        paramIndex++
      }

      if (endDate) {
        query += ` AND ra.metric_date <= $${paramIndex}`
        params.push(new Date(endDate).toISOString().split('T')[0])
        paramIndex++
      }

      query += ` ORDER BY ra.metric_date DESC`

      const analyticsRes = await client.query(query, params)

      // Calculate summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(r.id) as total_reviews,
          AVG(r.rating)::DECIMAL(3,2) as average_rating,
          COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
          COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star_count,
          COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star_count,
          COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star_count,
          COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star_count,
          (COUNT(CASE WHEN rr.id IS NOT NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(r.id), 0) * 100)::DECIMAL(5,2) as response_rate,
          COUNT(CASE WHEN rs.sentiment_label = 'positive' THEN 1 END) as sentiment_positive_count,
          COUNT(CASE WHEN rs.sentiment_label = 'negative' THEN 1 END) as sentiment_negative_count,
          COUNT(CASE WHEN rs.sentiment_label = 'neutral' THEN 1 END) as sentiment_neutral_count
        FROM reviews r
        LEFT JOIN review_responses rr ON r.id = rr.review_id
        LEFT JOIN review_sentiment rs ON r.id = rs.review_id
        WHERE r.shop_id = $1
      `
      const summaryParams: any[] = [parseInt(shopId)]

      if (barberId) {
        summaryQuery += ` AND r.barber_id = $2`
        summaryParams.push(parseInt(barberId))
      }

      const summaryRes = await client.query(summaryQuery, summaryParams)
      const summary = summaryRes.rows[0]

      routeLogger.debug('Analytics retrieved', { totalReviews: summary.total_reviews })

      return Response.json({
        success: true,
        summary: {
          totalReviews: parseInt(summary.total_reviews),
          averageRating: parseFloat(summary.average_rating) || 0,
          fiveStarCount: parseInt(summary.five_star_count),
          fourStarCount: parseInt(summary.four_star_count),
          threeStarCount: parseInt(summary.three_star_count),
          twoStarCount: parseInt(summary.two_star_count),
          oneStarCount: parseInt(summary.one_star_count),
          responseRate: parseFloat(summary.response_rate) || 0,
          sentimentPositive: parseInt(summary.sentiment_positive_count),
          sentimentNegative: parseInt(summary.sentiment_negative_count),
          sentimentNeutral: parseInt(summary.sentiment_neutral_count),
        },
        dailyData: analyticsRes.rows.map((row: any) => ({
          date: row.metric_date,
          barberId: row.barber_id,
          barberName: row.barber_name,
          totalReviews: parseInt(row.total_reviews),
          averageRating: parseFloat(row.average_rating) || 0,
          oneStar: parseInt(row.review_count_1_star),
          twoStar: parseInt(row.review_count_2_star),
          threeStar: parseInt(row.review_count_3_star),
          fourStar: parseInt(row.review_count_4_star),
          fiveStar: parseInt(row.review_count_5_star),
          responseRate: parseFloat(row.response_rate) || 0,
          sentimentPositive: parseInt(row.sentiment_positive_count),
          sentimentNegative: parseInt(row.sentiment_negative_count),
          sentimentNeutral: parseInt(row.sentiment_neutral_count),
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Review analytics error:', error)
    return Response.json(
      { error: 'Failed to fetch analytics', details: (error as Error).message },
      { status: 500 }
    )
  }
}
