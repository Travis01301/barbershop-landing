const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, type = 'SINGLE_SHOP', phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        email,
        type,
        phone,
      },
      include: { settings: true },
    });
    
    // Create default settings
    if (!organization.settings) {
      await prisma.organizationSettings.create({
        data: {
          organizationId: organization.id,
          appName: name,
        },
      });
    }
    
    // Create default billing
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    
    await prisma.organizationBilling.create({
      data: {
        organizationId: organization.id,
        billingEmail: email,
        nextBillingDate,
      },
    });
    
    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:id
 * Get organization details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        settings: true,
        billing: true,
        _count: {
          select: {
            shops: true,
            staff: true,
            users: true,
          },
        },
      },
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/organizations/:id
 * Update organization
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    
    // Only allow updating own org or if admin
    if (req.user?.organizationId !== id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
      include: { settings: true, billing: true },
    });
    
    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/organizations/:id
 * Delete organization (cascade delete all related data)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Only org owner can delete
    if (req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Only organization owner can delete' });
    }
    
    await prisma.organization.delete({
      where: { id },
    });
    
    res.json({ success: true, message: 'Organization deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:id/dashboard
 * Get organization dashboard data
 */
router.get('/:id/dashboard', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const [org, shops, staff, billing, analytics] = await Promise.all([
      prisma.organization.findUnique({ where: { id } }),
      prisma.organizationShop.findMany({
        where: { organizationId: id },
      }),
      prisma.organizationStaff.findMany({
        where: { organizationId: id },
        include: { user: true },
      }),
      prisma.organizationBilling.findUnique({
        where: { organizationId: id },
      }),
      prisma.usageAnalytics.findFirst({
        where: { organizationId: id },
        orderBy: { date: 'desc' },
      }),
    ]);
    
    res.json({
      organization: org,
      shops: shops.length,
      staff: staff.length,
      billing,
      analytics,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
