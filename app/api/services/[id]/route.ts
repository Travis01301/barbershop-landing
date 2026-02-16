import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import ServiceManager from '@/lib/services'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - Get single service
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.services.[id].GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)

    const service = await ServiceManager.getService(serviceId, decoded.shopId)

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    routeLogger.debug('Service fetched', { serviceId })
    return NextResponse.json({ success: true, service })
  } catch (error) {
    routeLogger.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

// PUT - Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.services.[id].PUT')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)
    const body = await request.json()

    routeLogger.debug('Updating service', { serviceId })

    const service = await ServiceManager.updateService(serviceId, decoded.shopId, {
      name: body.name,
      description: body.description,
      price: body.price || body.base_price,
      duration_minutes: body.duration_minutes,
      category: body.category,
      is_active: body.is_active !== undefined ? body.is_active : body.active
    })

    routeLogger.info('Service updated', { serviceId })
    return NextResponse.json({ success: true, service })
  } catch (error) {
    routeLogger.error('Error updating service:', error)
    const message = error instanceof Error ? error.message : 'Failed to update service'
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    )
  }
}

// DELETE - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const routeLogger = logger.createChild('api.services.[id].DELETE')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const serviceId = parseInt(params.id)

    routeLogger.debug('Deleting service', { serviceId })

    await ServiceManager.deleteService(serviceId, decoded.shopId)

    routeLogger.info('Service deleted', { serviceId })
    return NextResponse.json({ success: true, message: 'Service deleted' })
  } catch (error) {
    routeLogger.error('Error deleting service:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete service'
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    )
  }
}
