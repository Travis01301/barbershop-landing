const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

/**
 * GET /api/organizations/:orgId/billing
 * Get organization billing info
 */
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    
    const billing = await prisma.organizationBilling.findUnique({
      where: { organizationId: orgId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }
    
    res.json(billing);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/organizations/:orgId/billing
 * Update billing plan
 */
router.patch('/', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { plan, monthlyCharge, stripeCustomerId } = req.body;
    
    const billing = await prisma.organizationBilling.update({
      where: { organizationId: orgId },
      data: {
        ...(plan && { plan }),
        ...(monthlyCharge && { monthlyCharge }),
        ...(stripeCustomerId && { stripeCustomerId }),
      },
    });
    
    res.json(billing);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/billing/invoices
 * Create invoice
 */
router.post('/invoices', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { amount, dueDate } = req.body;
    
    const billing = await prisma.organizationBilling.findUnique({
      where: { organizationId: orgId },
    });
    
    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }
    
    const invoiceNumber = `INV-${orgId.slice(0, 8)}-${Date.now()}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        billingId: billing.id,
        invoiceNumber,
        amount: amount || billing.monthlyCharge,
        dueDate: new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organizations/:orgId/billing/invoices
 * List invoices
 */
router.get('/invoices', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { status } = req.query;
    
    const billing = await prisma.organizationBilling.findUnique({
      where: { organizationId: orgId },
    });
    
    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }
    
    const where = { billingId: billing.id };
    if (status) {
      where.status = status;
    }
    
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/billing/charge
 * Create charge via Stripe
 */
router.post('/charge', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const billing = await prisma.organizationBilling.findUnique({
      where: { organizationId: orgId },
    });
    
    if (!billing || !billing.stripeCustomerId) {
      return res.status(400).json({ error: 'No payment method on file' });
    }
    
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: billing.stripeCustomerId,
      description: description || `Charge for ${orgId}`,
    });
    
    // Create invoice record
    const invoiceNumber = `INV-${orgId.slice(0, 8)}-${Date.now()}`;
    
    const invoice = await prisma.invoice.create({
      data: {
        billingId: billing.id,
        invoiceNumber,
        amount,
        status: 'paid',
        paidAt: new Date(),
      },
    });
    
    res.status(201).json({
      charge,
      invoice,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organizations/:orgId/billing/payment-method
 * Add or update payment method
 */
router.post('/payment-method', requireAdmin, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { stripeToken } = req.body;
    
    if (!stripeToken) {
      return res.status(400).json({ error: 'Stripe token required' });
    }
    
    let billing = await prisma.organizationBilling.findUnique({
      where: { organizationId: orgId },
    });
    
    // Create or update Stripe customer
    if (!billing.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: billing.billingEmail,
        source: stripeToken,
      });
      
      billing = await prisma.organizationBilling.update({
        where: { organizationId: orgId },
        data: { stripeCustomerId: customer.id },
      });
    } else {
      await stripe.customers.update(billing.stripeCustomerId, {
        source: stripeToken,
      });
    }
    
    res.json(billing);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
