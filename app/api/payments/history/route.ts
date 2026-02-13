import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'

const historyLogger = logger.createChild('payment-history')

/**
 * GET /api/payments/history
 * Get payment history for shop or customer
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get('authorization')
    const token = jwtAuth.extractToken(authHeader)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await jwtAuth.verifyAccessToken(token)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    historyLogger.debug('Payment history request', {
      userId: user.userId,
      limit,
      offset,
    })

    let paymentQuery: string
    let queryParams: any[]

    if (user.role === 'admin') {
      // Admin can see all payments
      paymentQuery = `
        SELECT p.*, 
               a.start_time as appointment_date,
               c.name as customer_name,
               c.email as customer_email,
               b.name as barber_name,
               s.name as shop_name
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        JOIN customers c ON a.customer_id = c.id
        JOIN barbers b ON a.barber_id = b.id
        JOIN shops s ON a.shop_id = s.id
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `
      queryParams = [limit, offset]
    } else if (user.role === 'barber') {
      // Barbers see payments for their shop
      paymentQuery = `
        SELECT p.*,
               a.start_time as appointment_date,
               c.name as customer_name,
               c.email as customer_email,
               b.name as barber_name,
               s.name as shop_name
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        JOIN customers c ON a.customer_id = c.id
        JOIN barbers b ON a.barber_id = b.id
        JOIN shops s ON a.shop_id = s.id
        WHERE s.id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `
      queryParams = [user.shopId, limit, offset]
    } else {
      // Customers see only their own payments
      paymentQuery = `
        SELECT p.*,
               a.start_time as appointment_date,
               b.name as barber_name,
               s.name as shop_name
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        JOIN customers c ON a.customer_id = c.id
        JOIN barbers b ON a.barber_id = b.id
        JOIN shops s ON a.shop_id = s.id
        WHERE c.email = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `
      queryParams = [user.email, limit, offset]
    }

    const result = await query(paymentQuery, queryParams)

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM payments'
    const countResult = await query(countQuery)

    historyLogger.info('Payment history retrieved', {
      userId: user.userId,
      count: result.rowCount,
      total: countResult.rows[0].total,
    })

    return NextResponse.json({
      success: true,
      payments: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
      },
    })
  } catch (error) {
    historyLogger.error('Payment history error', error)
    return NextResponse.json(
      { error: 'Failed to retrieve payment history' },
      { status: 500 }
    )
  }
}
