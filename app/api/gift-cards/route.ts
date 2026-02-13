import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { CreateGiftCardSchema, validateInput, parseQueryParam } from '@/lib/validation'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// Generate unique gift card code
function generateGiftCardCode(): string {
  return 'GC-' + crypto.randomBytes(8).toString('hex').toUpperCase()
}

// GET - List gift cards for admin
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.gift-cards.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const { searchParams } = new URL(request.url)
    const status = parseQueryParam(searchParams.get('status')) || 'active' // active, redeemed, expired

    routeLogger.debug('Fetching gift cards', { shopId: decoded.shopId, status })

    let queryStr = 'SELECT id, code, amount, balance, recipient_name, recipient_email, is_active, expires_at, created_at, last_redeemed_at FROM gift_cards WHERE shop_id = $1'
    const params: any[] = [decoded.shopId]

    if (status === 'active') {
      queryStr += ' AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())'
    } else if (status === 'redeemed') {
      queryStr += ' AND balance = 0'
    } else if (status === 'expired') {
      queryStr += ' AND expires_at IS NOT NULL AND expires_at <= NOW()'
    }

    queryStr += ' ORDER BY created_at DESC LIMIT 100'

    const result = await query(queryStr, params)

    // Calculate summary stats
    const statsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_active AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END) as active,
        COUNT(CASE WHEN balance = 0 THEN 1 END) as redeemed,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 1 END) as expired,
        COALESCE(SUM(amount), 0) as total_issued,
        COALESCE(SUM(amount - balance), 0) as total_redeemed,
        COALESCE(SUM(balance), 0) as total_remaining
      FROM gift_cards
      WHERE shop_id = $1
    `, [decoded.shopId])

    routeLogger.debug('Gift cards fetched', { count: result.rows.length })
    return NextResponse.json({
      success: true,
      giftCards: result.rows,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    routeLogger.error('Error fetching gift cards:', error)
    return NextResponse.json({ error: 'Failed to fetch gift cards' }, { status: 500 })
  }
}

// POST - Create gift card (admin)
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.gift-cards.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateGiftCardSchema, body, 'gift-cards.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { amount, recipientName, recipientEmail, message, expiresAt, purchasedByEmail } = validation.data!
    routeLogger.debug('Creating gift card', { shopId: decoded.shopId, amount })

    const code = generateGiftCardCode()

    const result = await query(
      `INSERT INTO gift_cards (shop_id, code, amount, balance, recipient_name, recipient_email, message, expires_at, purchased_by_email)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, amount, balance, created_at`,
      [decoded.shopId, code, amount, recipientName || null, recipientEmail || null, message || null, expiresAt || null, purchasedByEmail || null]
    )

    routeLogger.info('Gift card created successfully', { giftCardId: result.rows[0].id, code, amount })
    return NextResponse.json({
      success: true,
      giftCard: result.rows[0]
    })
  } catch (error) {
    routeLogger.error('Error creating gift card:', error)
    return NextResponse.json({ error: 'Failed to create gift card' }, { status: 500 })
  }
}
