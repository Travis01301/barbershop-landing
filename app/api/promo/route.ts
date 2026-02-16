import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { promoService } from '@/lib/promo-service';
import {
  CreatePromoCodeSchema,
  ValidatePromoCodeSchema,
  UpdatePromoCodeSchema,
  validateInput,
  parseQueryParam,
} from '@/lib/validation';
import { query } from '@/lib/db';

const routeLogger = logger.createChild('api.promo');

/**
 * POST /api/promo
 * Create a new promo code (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateInput(CreatePromoCodeSchema, body, 'promo.create');
    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const {
      code,
      discountPercent,
      durationMonths,
      maxUses,
      expiresAt,
      description,
    } = validation.data!;

    routeLogger.debug('Creating promo code', { code, discountPercent, durationMonths });

    // Note: In production, verify admin status via JWT token
    // For now, assuming authentication is handled at middleware level

    const promoCode = await promoService.createPromoCode(
      code,
      discountPercent,
      durationMonths,
      maxUses,
      expiresAt,
      description
    );

    routeLogger.info('Promo code created successfully', { code: promoCode.code });

    return Response.json(
      {
        success: true,
        message: 'Promo code created successfully',
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discountPercent: promoCode.discountPercent,
          durationMonths: promoCode.durationMonths,
          maxUses: promoCode.maxUses,
          expiresAt: promoCode.expiresAt,
          isActive: promoCode.isActive,
          stripeCouponId: promoCode.stripeCouponId,
          createdAt: promoCode.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    routeLogger.error('Promo code creation error:', error);
    return Response.json(
      {
        error: 'Failed to create promo code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/promo
 * Get all promo codes or single code (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = parseQueryParam(searchParams.get('code'));
    const id = parseQueryParam(searchParams.get('id'));

    routeLogger.debug('Fetching promo codes', { code, id });

    if (code) {
      // Validate single code
      const validation = await promoService.validatePromoCode(code);
      return Response.json({
        success: true,
        isValid: validation.isValid,
        reason: validation.reason,
        code: validation.code,
      });
    }

    if (id) {
      // Get specific code
      const promoCode = await promoService.getPromoCodeById(parseInt(id));
      if (!promoCode) {
        return Response.json({ error: 'Promo code not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        promoCode,
      });
    }

    // Get all codes (admin only)
    const codes = await promoService.getAllPromoCodes();
    return Response.json({
      success: true,
      codes,
      total: codes.length,
    });
  } catch (error) {
    routeLogger.error('Promo code fetch error:', error);
    return Response.json(
      {
        error: 'Failed to fetch promo codes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/promo
 * Update a promo code (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json({ error: 'Promo code ID is required' }, { status: 400 });
    }

    const validation = validateInput(UpdatePromoCodeSchema, body, 'promo.update');
    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    routeLogger.debug('Updating promo code', { id: body.id });

    const updatedCode = await promoService.updatePromoCode(body.id, validation.data!);

    routeLogger.info('Promo code updated successfully', { id: body.id });

    return Response.json({
      success: true,
      message: 'Promo code updated successfully',
      promoCode: updatedCode,
    });
  } catch (error) {
    routeLogger.error('Promo code update error:', error);
    return Response.json(
      {
        error: 'Failed to update promo code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promo
 * Delete a promo code (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseQueryParam(searchParams.get('id'));

    if (!id) {
      return Response.json({ error: 'Promo code ID is required' }, { status: 400 });
    }

    routeLogger.debug('Deleting promo code', { id });

    await promoService.deletePromoCode(parseInt(id));

    routeLogger.info('Promo code deleted successfully', { id });

    return Response.json({
      success: true,
      message: 'Promo code deleted successfully',
    });
  } catch (error) {
    routeLogger.error('Promo code deletion error:', error);
    return Response.json(
      {
        error: 'Failed to delete promo code',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
