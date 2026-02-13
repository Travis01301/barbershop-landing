import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.appointments.GET')
  
  try {
    // Get token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    routeLogger.debug('Token verified', { shopId: decoded.shopId })

    // Get appointments for this shop
    const result = await query(
      `SELECT 
        a.id, 
        a.customer_name, 
        a.customer_phone, 
        a.customer_email,
        a.start_time, 
        a.status, 
        a.notes,
        u.name as barber_name
      FROM appointments a
      LEFT JOIN users u ON a.barber_id = u.id
      WHERE a.shop_id = $1
      ORDER BY a.start_time DESC
      LIMIT 50`,
      [decoded.shopId]
    )

    routeLogger.debug('Appointments fetched', { count: result.rows.length })
    return NextResponse.json({ success: true, appointments: result.rows })
  } catch (error) {
    routeLogger.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
