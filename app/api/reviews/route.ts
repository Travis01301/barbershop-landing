import { Pool } from 'pg'
import { NextRequest } from 'next/server'
import { query, getClient } from '@/lib/db'


export async function POST(request: NextRequest) {
  try {
    const { appointmentId, customerId, barberId, shopId, rating, comment } = await request.json()

    // Validate input
    if (!appointmentId || !customerId || !barberId || !shopId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const client = await getClient()

    try {
      // Check if appointment exists and belongs to this customer
      const appointmentRes = await client.query(
        'SELECT id FROM appointments WHERE id = $1 AND customer_id = $2 AND shop_id = $3',
        [appointmentId, customerId, shopId]
      )

      if (appointmentRes.rows.length === 0) {
        return Response.json({ error: 'Appointment not found' }, { status: 404 })
      }

      // Check if review already exists for this appointment
      const existingReviewRes = await client.query(
        'SELECT id FROM reviews WHERE appointment_id = $1',
        [appointmentId]
      )

      if (existingReviewRes.rows.length > 0) {
        return Response.json({ error: 'Review already submitted for this appointment' }, { status: 400 })
      }

      // Insert review
      const reviewRes = await client.query(
        `INSERT INTO reviews (shop_id, barber_id, customer_id, appointment_id, rating, comment, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, created_at`,
        [shopId, barberId, customerId, appointmentId, rating, comment || null]
      )

      const review = reviewRes.rows[0]

      // Update appointment to mark review as submitted
      await client.query(
        'UPDATE appointments SET review_submitted = true WHERE id = $1',
        [appointmentId]
      )

      // Update barber's average rating
      const statsRes = await client.query(
        `SELECT COUNT(*) as count, AVG(rating) as avg_rating
         FROM reviews WHERE barber_id = $1 AND is_approved = true`,
        [barberId]
      )

      const { count, avg_rating } = statsRes.rows[0]
      await client.query(
        'UPDATE users SET review_count = $1, average_rating = $2 WHERE id = $3',
        [parseInt(count), parseFloat(avg_rating) || 0, barberId]
      )

      return Response.json({
        success: true,
        message: 'Review submitted successfully',
        review: {
          id: review.id,
          rating,
          comment,
          createdAt: review.created_at,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Review submission error:', error)
    return Response.json(
      { error: 'Failed to submit review', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const barberId = searchParams.get('barberId')

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    const client = await getClient()

    try {
      let query = `
        SELECT r.id, r.rating, r.comment, r.created_at,
               cp.name as customer_name,
               u.name as barber_name
        FROM reviews r
        JOIN customer_profiles cp ON r.customer_id = cp.id
        JOIN users u ON r.barber_id = u.id
        WHERE r.shop_id = $1 AND r.is_approved = true
      `
      const params: (string | number)[] = [parseInt(shopId)]

      if (barberId) {
        query += ` AND r.barber_id = $2`
        params.push(parseInt(barberId))
      }

      query += ` ORDER BY r.created_at DESC LIMIT 50`

      const reviewsRes = await client.query(query, params)

      return Response.json({
        success: true,
        reviews: reviewsRes.rows.map((row) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment,
          customerName: row.customer_name,
          barberName: row.barber_name,
          createdAt: row.created_at,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Review fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch reviews', details: (error as Error).message },
      { status: 500 }
    )
  }
}
