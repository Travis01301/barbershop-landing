import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { validateInput, UpdateShiftTemplateSchema } from '@/lib/validation'
import * as shiftService from '@/lib/shift-scheduling-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const routeLogger = logger.createChild('api.shifts.templates.[id]')

/**
 * PATCH - Update a shift template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { shopId: number }
    const templateId = parseInt(params.id)

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const body = await request.json()
    const validation = validateInput(UpdateShiftTemplateSchema, body, 'shift-template.update')
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 })
    }

    routeLogger.debug('Updating shift template', { templateId, shopId: decoded.shopId })

    const template = await shiftService.updateShiftTemplate(templateId, decoded.shopId, validation.data!)

    routeLogger.info('Shift template updated', { templateId })

    return NextResponse.json({
      success: true,
      template,
    })
  } catch (error: any) {
    if (error.message === 'Shift template not found') {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }
    routeLogger.error('Error updating shift template:', error)
    return NextResponse.json({ error: 'Failed to update shift template' }, { status: 500 })
  }
}

/**
 * DELETE - Delete (deactivate) a shift template
 */
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
    const templateId = parseInt(params.id)

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    routeLogger.debug('Deleting shift template', { templateId, shopId: decoded.shopId })

    await shiftService.deleteShiftTemplate(templateId, decoded.shopId)

    routeLogger.info('Shift template deleted', { templateId })

    return NextResponse.json({
      success: true,
      message: 'Shift template deleted',
    })
  } catch (error: any) {
    if (error.message === 'Shift template not found') {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }
    routeLogger.error('Error deleting shift template:', error)
    return NextResponse.json({ error: 'Failed to delete shift template' }, { status: 500 })
  }
}
