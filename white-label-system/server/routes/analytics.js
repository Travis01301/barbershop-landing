const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

/**
 * GET /api/organizations/:orgId/analytics
 * Get organization-wide analytics
 */
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { period = 'monthly', limit = 12 } = req.query;
    
    // Get analytics data
    const analytics = await prisma.usageAnalytics.findMany({
      where: {
        organizationId: orgId,
        period,
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
    });
    
    // Get summary stats
    const latest = analytics[0] || {};
    
    const summary = {
      totalAppointments: latest.totalAppointments || 0,
      totalRevenue: latest.totalRevenue || 0,
      activeCustomers: latest.activeCustomers || 0,
      activeStaff: latest.activeStaff || 0,
    };
    
    res.json({
      summary,
      analytics: analytics.reverse(),
      period,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/analytics/summary
 * Get quick summary
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const [shops, staff, analytics] = await Promise.all([
      prisma.organizationShop.count({
        where: { organizationId: orgId, isActive: true },
      }),
      prisma.organizationStaff.count({
        where: { organizationId: orgId },
      }),
      prisma.usageAnalytics.findFirst({
        where: { organizationId: orgId },
        orderBy: { date: 'desc' },
      }),
    ]);
    
    res.json({
      activeShops: shops,
      totalStaff: staff,
      totalAppointments: analytics?.totalAppointments || 0,
      totalRevenue: analytics?.totalRevenue || 0,
      activeCustomers: analytics?.activeCustomers || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/analytics/shops
 * Get per-shop analytics
 */
router.get('/shops', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const shops = await prisma.organizationShop.findMany({
      where: { organizationId: orgId, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
      },
    });
    
    res.json(shops);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/analytics/record
 * Record usage event (internal API)
 */
router.post('/record', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { metric, value, date = new Date() } = req.body;
    
    // Find or create daily analytics record
    let analytics = await prisma.usageAnalytics.findFirst({
      where: {
        organizationId: orgId,
        period: 'daily',
        date: {
          gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(date).setHours(24, 0, 0, 0)),
        },
      },
    });
    
    if (!analytics) {
      analytics = await prisma.usageAnalytics.create({
        data: {
          organizationId: orgId,
          period: 'daily',
          date: new Date(date),
        },
      });
    }
    
    // Update metric
    const updateData = {};
    switch (metric) {
      case 'appointment':
        updateData.totalAppointments = analytics.totalAppointments + (value || 1);
        break;
      case 'revenue':
        updateData.totalRevenue = analytics.totalRevenue + (value || 0);
        break;
      case 'customer':
        updateData.activeCustomers = Math.max(analytics.activeCustomers, value || 1);
        break;
      case 'staff':
        updateData.activeStaff = Math.max(analytics.activeStaff, value || 1);
        break;
      default:
        return res.status(400).json({ error: 'Invalid metric' });
    }
    
    const updated = await prisma.usageAnalytics.update({
      where: { id: analytics.id },
      data: updateData,
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
