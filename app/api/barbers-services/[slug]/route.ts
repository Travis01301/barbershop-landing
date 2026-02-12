import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

// GET - Get barber and their services by shop slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')

    // Get shop by slug
    const shopResult = await pool.query(
      'SELECT id, name FROM shops WHERE slug = $1',
      [params.slug]
    )

    if (shopResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopResult.rows[0].id

    // Get barber (if specified) or all barbers
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.average_rating,
        u.review_count,
        COALESCE(
          json_agg(
            json_build_object(
              'service_id', s.id,
              'name', s.name,
              'description', s.description,
              'base_price', s.base_price,
              'base_duration', s.duration_minutes,
              'price', bs.price,
              'duration', bs.duration_minutes,
              'available', bs.available
            ) ORDER BY s.name
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) as services
      FROM users u
      LEFT JOIN barber_services bs ON u.id = bs.barber_id
      LEFT JOIN services s ON s.id = bs.service_id AND s.active = true
      WHERE u.shop_id = $1 AND u.role = 'barber' AND u.is_active = true
    `

    let params_array: (string | number)[] = [shopId]

    if (barberId) {
      query += ' AND u.id = $2'
      params_array.push(parseInt(barberId))
    }

    query += ' GROUP BY u.id, u.name, u.email, u.average_rating, u.review_count ORDER BY u.name'

    const result = await pool.query(query, params_array)

    if (barberId && result.rows.length === 0) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      shop: shopResult.rows[0],
      barbers: result.rows,
    })
  } catch (error) {
    console.error('Error fetching barber services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch barber services' },
      { status: 500 }
    )
  }
}
