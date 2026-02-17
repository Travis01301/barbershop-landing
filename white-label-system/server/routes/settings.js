const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');
const { requireOrganization } = require('../middleware/multiTenant');
const multer = require('multer');
const path = require('path');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// Configure multer for logo upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/logos');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and SVG allowed.'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

/**
 * GET /api/organizations/:orgId/settings
 * Get organization settings
 */
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
    });
    
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/organizations/:orgId/settings
 * Update organization branding and settings
 */
router.patch('/', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const {
      appName,
      primaryColor,
      secondaryColor,
      accentColor,
      fontFamily,
      customDomain,
      emailDomain,
      supportEmail,
      welcomeMessage,
      helpText,
      enableShopCustomization,
      enableStaffManagement,
      enableAdvancedAnalytics,
    } = req.body;
    
    // Validate colors
    if (primaryColor && !isValidColor(primaryColor)) {
      return res.status(400).json({ error: 'Invalid primary color format' });
    }
    if (secondaryColor && !isValidColor(secondaryColor)) {
      return res.status(400).json({ error: 'Invalid secondary color format' });
    }
    if (accentColor && !isValidColor(accentColor)) {
      return res.status(400).json({ error: 'Invalid accent color format' });
    }
    
    // Validate domain (if provided)
    if (customDomain && !isValidDomain(customDomain)) {
      return res.status(400).json({ error: 'Invalid custom domain format' });
    }
    
    const settings = await prisma.organizationSettings.update({
      where: { organizationId: orgId },
      data: {
        ...(appName && { appName }),
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(accentColor && { accentColor }),
        ...(fontFamily && { fontFamily }),
        ...(customDomain && { customDomain }),
        ...(emailDomain && { emailDomain }),
        ...(supportEmail && { supportEmail }),
        ...(welcomeMessage && { welcomeMessage }),
        ...(helpText !== undefined && { helpText }),
        ...(enableShopCustomization !== undefined && { enableShopCustomization }),
        ...(enableStaffManagement !== undefined && { enableStaffManagement }),
        ...(enableAdvancedAnalytics !== undefined && { enableAdvancedAnalytics }),
      },
    });
    
    res.json(settings);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Domain or email already in use' });
    }
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/settings/logo
 * Upload logo
 */
router.post('/logo', requireAdmin, upload.single('logo'), async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    const settings = await prisma.organizationSettings.update({
      where: { organizationId: orgId },
      data: {
        logoUrl,
        logoUploadedAt: new Date(),
      },
    });
    
    res.json({ logoUrl, settings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/settings/public
 * Get public branding settings (no auth required)
 */
router.get('/public', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        appName: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        fontFamily: true,
        welcomeMessage: true,
      },
    });
    
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * Helper functions
 */
function isValidColor(color) {
  // Hex color validation
  return /^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color);
}

function isValidDomain(domain) {
  // Simple domain validation
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain);
}

module.exports = router;
