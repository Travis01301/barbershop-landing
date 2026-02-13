import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Pool } from 'pg'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Get single service
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)

    const result = await query(
      `SELECT 
        id, 
        shop_id,
        name, 
        description, 
        base_price, 
        duration_minutes, 
        category,
        active,
        created_at,
        updated_at
      FROM services 
      WHERE id = $1 AND shop_id = $2`,
      [serviceId, decoded.shopId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, service: result.rows[0] })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

// PUT - Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)
    const { name, description, base_price, duration_minutes, category, active } =
      await request.json()

    // Verify service belongs to shop
    const existingService = await query(
      'SELECT id FROM services WHERE id = $1 AND shop_id = $2',
      [serviceId, decoded.shopId]
    )

    if (existingService.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Update service
    const result = await query(
      `UPDATE services 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           base_price = COALESCE($3, base_price),
           duration_minutes = COALESCE($4, duration_minutes),
           category = COALESCE($5, category),
           active = COALESCE($6, active)
       WHERE id = $7 AND shop_id = $8
       RETURNING id, name, base_price, duration_minutes, category, active, updated_at`,
      [name, description, base_price, duration_minutes, category, active, serviceId, decoded.shopId]
    )

    return NextResponse.json({ success: true, service: result.rows[0] })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

// DELETE - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)

    // Verify service belongs to shop
    const existingService = await query(
      'SELECT id FROM services WHERE id = $1 AND shop_id = $2',
      [serviceId, decoded.shopId]
    )

    if (existingService.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Delete service (cascade will handle barber_services entries)
    await query('DELETE FROM services WHERE id = $1 AND shop_id = $2', [
      serviceId,
      decoded.shopId,
    ])

    return NextResponse.json({ success: true, message: 'Service deleted' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
