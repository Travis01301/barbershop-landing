import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Get customer profile with appointment history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const customerId = parseInt(id)

    // Get customer profile
    const customerResult = await query(
      `SELECT * FROM customer_profiles
       WHERE id = $1 AND shop_id = $2`,
      [customerId, decoded.shopId]
    )

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customer = customerResult.rows[0]

    // Get appointment history
    const appointmentsResult = await query(
      `SELECT
        a.id,
        a.start_time as date,
        a.status,
        a.notes,
        u.name as barber_name
       FROM appointments a
       LEFT JOIN users u ON a.barber_id = u.id
       WHERE a.customer_id = $1
       ORDER BY a.start_time DESC`,
      [customerId]
    )

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        appointment_history: appointmentsResult.rows,
      },
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

// PUT - Update customer profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const customerId = parseInt(id)
    const updates = await request.json()

    // Verify customer belongs to shop
    const checkResult = await query(
      `SELECT id FROM customer_profiles WHERE id = $1 AND shop_id = $2`,
      [customerId, decoded.shopId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Build dynamic update query
    const allowedFields = [
      'name',
      'phone',
      'address',
      'styling_notes',
      'allergies',
      'health_notes',
      'preferred_barber_id',
      'preferred_contact_method',
      'do_not_disturb_time',
    ]

    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`)
        updateValues.push(value)
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(customerId)
    updateValues.push(decoded.shopId)

    const result = await query(
      `UPDATE customer_profiles
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND shop_id = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    )

    return NextResponse.json({
      success: true,
      customer: result.rows[0],
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}
