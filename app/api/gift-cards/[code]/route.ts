import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Check gift card balance and validity
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = await params
    const { searchParams } = new URL(request.url)
    const shopSlug = searchParams.get('shopSlug')

    // Get shop ID from slug
    const shopResult = await query(
      'SELECT id FROM shops WHERE slug = $1',
      [shopSlug]
    )
    if (shopResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    const shopId = shopResult.rows[0].id

    // Check gift card
    const result = await query(
      `SELECT id, code, amount, balance, recipient_name, is_active, expires_at, created_at, last_redeemed_at
       FROM gift_cards
       WHERE code = $1 AND shop_id = $2`,
      [code.toUpperCase(), shopId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Gift card not found', valid: false }, { status: 404 })
    }

    const giftCard = result.rows[0]

    // Check validity
    let valid = true
    let reason = null

    if (!giftCard.is_active) {
      valid = false
      reason = 'Gift card has been deactivated'
    } else if (giftCard.balance <= 0) {
      valid = false
      reason = 'Gift card has been fully redeemed'
    } else if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      valid = false
      reason = 'Gift card has expired'
    }

    return NextResponse.json({
      valid,
      reason,
      giftCard: valid ? {
        code: giftCard.code,
        balance: parseFloat(giftCard.balance),
        originalAmount: parseFloat(giftCard.amount),
      } : null
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to validate gift card', valid: false }, { status: 500 })
  }
}

// POST - Redeem gift card for an appointment
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = await params
    const { shopSlug, appointmentId, amount, customerEmail } = await request.json()

    // Get shop ID
    const shopResult = await query(
      'SELECT id FROM shops WHERE slug = $1',
      [shopSlug]
    )
    if (shopResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    const shopId = shopResult.rows[0].id

    // Get gift card with lock
    const giftCardResult = await query(
      `SELECT id, balance, is_active, expires_at
       FROM gift_cards
       WHERE code = $1 AND shop_id = $2 AND is_active = true`,
      [code.toUpperCase(), shopId]
    )

    if (giftCardResult.rows.length === 0) {
      return NextResponse.json({ error: 'Gift card not found or invalid' }, { status: 404 })
    }

    const giftCard = giftCardResult.rows[0]
    const amountToRedeem = Math.min(amount || parseFloat(giftCard.balance), parseFloat(giftCard.balance))

    if (amountToRedeem <= 0) {
      return NextResponse.json({ error: 'Insufficient gift card balance' }, { status: 400 })
    }

    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Gift card has expired' }, { status: 400 })
    }

    // Update gift card balance
    const updateResult = await query(
      `UPDATE gift_cards
       SET balance = balance - $1,
           last_redeemed_at = NOW(),
           first_redeemed_at = COALESCE(first_redeemed_at, NOW())
       WHERE id = $2
       RETURNING balance`,
      [amountToRedeem, giftCard.id]
    )

    // Record redemption
    await query(
      `INSERT INTO gift_card_redemptions (shop_id, gift_card_id, appointment_id, amount_redeemed, redeemed_by_email)
       VALUES ($1, $2, $3, $4, $5)`,
      [shopId, giftCard.id, appointmentId || null, amountToRedeem, customerEmail]
    )

    return NextResponse.json({
      success: true,
      amountRedeemed: amountToRedeem,
      remainingBalance: parseFloat(updateResult.rows[0].balance)
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to redeem gift card' }, { status: 500 })
  }
}
