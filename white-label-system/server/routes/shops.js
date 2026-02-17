const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

/**
 * POST /api/organizations/:orgId/shops
 * Add shop to organization
 */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      capacity = 5,
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Shop name is required' });
    }
    
    const shop = await prisma.organizationShop.create({
      data: {
        organizationId: orgId,
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        email,
        capacity,
      },
    });
    
    res.status(201).json(shop);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Shop with this email already exists' });
    }
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/shops
 * List all shops in organization
 */
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { isActive } = req.query;
    
    const where = { organizationId: orgId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const shops = await prisma.organizationShop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(shops);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/shops/:shopId
 * Get shop details
 */
router.get('/:shopId', async (req, res, next) => {
  try {
    const { orgId, shopId } = req.params;
    
    const shop = await prisma.organizationShop.findFirst({
      where: {
        id: shopId,
        organizationId: orgId,
      },
    });
    
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    res.json(shop);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/organizations/:orgId/shops/:shopId
 * Update shop
 */
router.patch('/:shopId', requireAdmin, async (req, res, next) => {
  try {
    const { orgId, shopId } = req.params;
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      capacity,
      isActive,
      primaryColor,
      secondaryColor,
    } = req.body;
    
    const shop = await prisma.organizationShop.updateMany({
      where: {
        id: shopId,
        organizationId: orgId,
      },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(capacity && { capacity }),
        ...(isActive !== undefined && { isActive }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
      },
    });
    
    if (shop.count === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    const updated = await prisma.organizationShop.findUnique({
      where: { id: shopId },
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/organizations/:orgId/shops/:shopId
 * Delete shop (soft delete)
 */
router.delete('/:shopId', requireAdmin, async (req, res, next) => {
  try {
    const { orgId, shopId } = req.params;
    
    await prisma.organizationShop.updateMany({
      where: {
        id: shopId,
        organizationId: orgId,
      },
      data: { isActive: false },
    });
    
    res.json({ success: true, message: 'Shop deactivated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
