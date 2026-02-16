import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import ServiceManager from '@/lib/services'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// PUT - Update barber service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  const routeLogger = logger.createChild('api.barbers.[id].services.[serviceId].PUT')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const serviceId = parseInt(params.serviceId)
    const body = await request.json()

    routeLogger.debug('Updating barber service', {
      barberId,
      serviceId,
      shopId: decoded.shopId
    })

    const barberService = await ServiceManager.updateBarberService(barberId, serviceId, {
      price: body.price,
      duration_minutes: body.duration_minutes,
      is_available: body.is_available
    })

    routeLogger.info('Barber service updated', { barberId, serviceId })
    return NextResponse.json({ success: true, service: barberService })
  } catch (error) {
    routeLogger.error('Error updating barber service:', error)
    const message = error instanceof Error ? error.message : 'Failed to update barber service'
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') || message.includes('not assigned') ? 404 : 500 }
    )
  }
}

// DELETE - Remove service from barber
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; serviceId: string } }
) {
  const routeLogger = logger.createChild('api.barbers.[id].services.[serviceId].DELETE')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const barberId = parseInt(params.id)
    const serviceId = parseInt(params.serviceId)

    routeLogger.debug('Removing service from barber', {
      barberId,
      serviceId,
      shopId: decoded.shopId
    })

    await ServiceManager.removeServiceFromBarber(barberId, serviceId)

    routeLogger.info('Service removed from barber', { barberId, serviceId })
    return NextResponse.json({ success: true, message: 'Service removed from barber' })
  } catch (error) {
    routeLogger.error('Error removing service from barber:', error)
    return NextResponse.json({ error: 'Failed to remove service' }, { status: 500 })
  }
}
