import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import ServiceManager from '@/lib/services'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Get services for a specific barber
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.barbers.[id].services.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)

    routeLogger.debug('Token verified', { shopId: decoded.shopId, barberId })

    const services = await ServiceManager.getBarberServices(barberId)

    routeLogger.debug('Barber services fetched', { count: services.length })
    return NextResponse.json({ success: true, services })
  } catch (error) {
    routeLogger.error('Error fetching barber services:', error)
    return NextResponse.json({ error: 'Failed to fetch barber services' }, { status: 500 })
  }
}

// POST - Assign service to barber
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.barbers.[id].services.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const body = await request.json()

    const { service_id, price, duration_minutes } = body

    if (!service_id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    routeLogger.debug('Assigning service to barber', {
      barberId,
      serviceId: service_id,
      shopId: decoded.shopId
    })

    const barberService = await ServiceManager.assignServiceToBarber(
      barberId,
      service_id,
      decoded.shopId,
      price,
      duration_minutes
    )

    routeLogger.info('Service assigned to barber', { barberId, serviceId: service_id })
    return NextResponse.json(
      { success: true, service: barberService },
      { status: 201 }
    )
  } catch (error) {
    routeLogger.error('Error assigning service:', error)
    const message = error instanceof Error ? error.message : 'Failed to assign service'
    const status = message.includes('not found') ? 404 : message.includes('already assigned') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
