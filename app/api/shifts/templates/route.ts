import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, CreateShiftTemplateSchema, UpdateShiftTemplateSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.templates')

/**
 * GET - List all shift templates for a shop
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    routeLogger.debug('Fetching shift templates', { shopId: decoded.shopId })

    const templates = await shiftService.getShiftTemplates(decoded.shopId)

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    })
  } catch (error) {
    routeLogger.error('Error fetching shift templates:', error)
    return NextResponse.json({ error: 'Failed to fetch shift templates' }, { status: 500 })
  }
}

/**
 * POST - Create a new shift template
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number; userId: number }
    const body = await request.json()

    const validation = validateInput(CreateShiftTemplateSchema, body, 'shift-template.create')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    const { name, description, startTime, endTime, minBarbersRequired, maxBarbersAllowed, recurringPattern, recurringDays } = validation.data!

    routeLogger.debug('Creating shift template', {
      shopId: decoded.shopId,
      name,
      startTime,
      endTime,
    })

    const template = await shiftService.createShiftTemplate(
      decoded.shopId,
      name,
      startTime,
      endTime,
      {
        description,
        minBarbersRequired,
        maxBarbersAllowed,
        recurringPattern,
        recurringDays,
        createdBy: decoded.userId,
      }
    )

    routeLogger.info('Shift template created', { templateId: template.id })

    return NextResponse.json({
      success: true,
      template,
    }, { status: 201 })
  } catch (error) {
    routeLogger.error('Error creating shift template:', error)
    return NextResponse.json({ error: 'Failed to create shift template' }, { status: 500 })
  }
}
