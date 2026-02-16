import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { CreateServiceSchema, validateInput } from '@/lib/validation'
import ServiceManager from '@/lib/services'

const JWT_SECRET = 'your-secret-key-change-this-in-production'

// GET - List all services for the shop
export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.services.GET')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const url = new URL(request.url)
    const category = url.searchParams.get('category') || undefined
    const activeOnly = url.searchParams.get('activeOnly') !== 'false'

    routeLogger.debug('Token verified', { shopId: decoded.shopId })

    const services = await ServiceManager.getShopServices(decoded.shopId, category, activeOnly)

    routeLogger.debug('Services fetched', { count: services.length })
    return NextResponse.json({ success: true, services })
  } catch (error) {
    routeLogger.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST - Create new service
export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.services.POST')
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const body = await request.json()

    // Validate input
    const validation = validateInput(CreateServiceSchema, body, 'services.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { name, description, base_price, duration_minutes, category } = validation.data!
    routeLogger.debug('Creating service', { shopId: decoded.shopId, name })

    const service = await ServiceManager.addService(
      decoded.shopId,
      name,
      base_price,
      duration_minutes,
      description,
      category
    )

    routeLogger.info('Service created successfully', { serviceId: service.id, name })
    return NextResponse.json(
      { success: true, service },
      { status: 201 }
    )
  } catch (error) {
    routeLogger.error('Error creating service:', error)
    const message = error instanceof Error ? error.message : 'Failed to create service'
    return NextResponse.json({ error: message }, { status: error instanceof Error && message.includes('already exists') ? 409 : 500 })
  }
}
