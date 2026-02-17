const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

/**
 * POST /api/organizations/:orgId/staff
 * Add staff member to organization
 */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { email, role = 'STAFF', shopIds = [] } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email,
        role,
        token,
        expiresAt,
      },
    });
    
    // Send invitation email
    await sendInvitationEmail(email, orgId, token);
    
    res.status(201).json(invitation);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Invitation already sent to this email' });
    }
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/staff
 * List all staff members
 */
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const staff = await prisma.organizationStaff.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: { joinedAt: 'desc' },
    });
    
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/staff/invitations
 * List pending invitations
 */
router.get('/invitations', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: orgId,
        isAccepted: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/organizations/:orgId/staff/:staffId
 * Update staff member
 */
router.patch('/:staffId', requireAdmin, async (req, res, next) => {
  try {
    const { orgId, staffId } = req.params;
    const { role, shopIds } = req.body;
    
    const staff = await prisma.organizationStaff.updateMany({
      where: {
        id: staffId,
        organizationId: orgId,
      },
      data: {
        ...(role && { role }),
        ...(shopIds && { shopIds }),
      },
    });
    
    if (staff.count === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    const updated = await prisma.organizationStaff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/organizations/:orgId/staff/:staffId
 * Remove staff member
 */
router.delete('/:staffId', requireAdmin, async (req, res, next) => {
  try {
    const { orgId, staffId } = req.params;
    
    await prisma.organizationStaff.deleteMany({
      where: {
        id: staffId,
        organizationId: orgId,
      },
    });
    
    res.json({ success: true, message: 'Staff member removed' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/staff/invitations/:inviteId/accept
 * Accept staff invitation
 */
router.post('/invitations/:inviteId/accept', async (req, res, next) => {
  try {
    const { orgId, inviteId } = req.params;
    const { token } = req.body;
    
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        id: inviteId,
        organizationId: orgId,
        token,
        isAccepted: false,
      },
    });
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    
    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Mark as accepted
    await prisma.organizationInvitation.update({
      where: { id: inviteId },
      data: {
        isAccepted: true,
        acceptedAt: new Date(),
      },
    });
    
    res.json({ success: true, message: 'Invitation accepted' });
  } catch (error) {
    next(error);
  }
});

/**
 * Send invitation email
 */
async function sendInvitationEmail(email, orgId, token) {
  // Configure email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  const inviteLink = `${process.env.APP_URL}/organizations/${orgId}/staff/invite?token=${token}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@barbershop.com',
    to: email,
    subject: 'You\'ve been invited to BarberFlow',
    html: `
      <h2>You're invited!</h2>
      <p>You've been invited to join BarberFlow.</p>
      <p><a href="${inviteLink}">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

module.exports = router;
