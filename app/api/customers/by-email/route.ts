import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

const customerLogger = logger.createChild('CustomerByEmail')

/**
 * GET - Check if customer exists by email (public endpoint for booking form)
 * Query params: shopId, email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const email = searchParams.get('email')

    customerLogger.debug('Customer lookup request', { shopId, email })

    if (!shopId || !email) {
      customerLogger.warn('Missing required parameters', { shopId: !!shopId, email: !!email })
      return NextResponse.json(
        { error: 'shopId and email are required' },
        { status: 400 }
      )
    }

    const result = await query(
      `SELECT id, name, phone, styling_notes, allergies, preferred_barber_id
       FROM customer_profiles
       WHERE shop_id = $1 AND email = $2`,
      [parseInt(shopId), email]
    )

    if (result.rowCount > 0) {
      customerLogger.info('Customer found', { customerId: result.rows[0].id })
      return NextResponse.json({
        success: true,
        customer: result.rows[0],
      })
    } else {
      customerLogger.debug('No customer found for email', { email })
      return NextResponse.json({
        success: true,
        customer: null,
      })
    }
  } catch (error) {
    customerLogger.error('Error checking customer', error)
    return NextResponse.json({ success: false, error: 'Failed to check customer' }, { status: 500 })
  }
}
