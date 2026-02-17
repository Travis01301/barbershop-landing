const request = require('supertest');
const { app, prisma } = require('../server/index');
const { generateToken } = require('../server/middleware/auth');

describe('Billing & Payments', () => {
  let org, admin, token;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: {
        name: 'Billing Test Org',
        email: 'billing@test.com',
        type: 'AGENCY',
        settings: { create: { appName: 'Billing Test' } },
        billing: {
          create: {
            plan: 'STARTER',
            monthlyCharge: 99,
            billingEmail: 'billing@test.com',
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { billing: true },
    });

    admin = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'admin@test.com',
        name: 'Admin',
        passwordHash: 'hashed',
      },
    });

    await prisma.organizationStaff.create({
      data: {
        organizationId: org.id,
        userId: admin.id,
        role: 'ADMIN',
      },
    });

    token = generateToken(admin.id, org.id, 'ADMIN');
  });

  afterEach(async () => {
    await prisma.invoice.deleteMany();
    await prisma.organizationBilling.deleteMany();
    await prisma.organizationStaff.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizationSettings.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('GET /api/organizations/:orgId/billing', () => {
    test('should fetch billing information', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('STARTER');
      expect(response.body.monthlyCharge).toBe(99);
      expect(response.body.billingEmail).toBe('billing@test.com');
    });

    test('should include recent invoices', async () => {
      await prisma.invoice.create({
        data: {
          billingId: org.billing.id,
          invoiceNumber: 'INV-001',
          amount: 99,
          dueDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.invoices).toHaveLength(1);
      expect(response.body.invoices[0].invoiceNumber).toBe('INV-001');
    });

    test('should return 404 for non-existent org', async () => {
      const response = await request(app)
        .get('/api/organizations/nonexistent/billing')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/organizations/:orgId/billing', () => {
    test('should upgrade plan', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          plan: 'PROFESSIONAL',
          monthlyCharge: 299,
        });

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('PROFESSIONAL');
      expect(response.body.monthlyCharge).toBe(299);
    });

    test('should downgrade plan', async () => {
      // First upgrade
      await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'ENTERPRISE', monthlyCharge: 999 });

      // Then downgrade
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({ plan: 'STARTER', monthlyCharge: 99 });

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('STARTER');
    });

    test('should require admin role', async () => {
      const staffUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff@test.com',
          name: 'Staff',
          passwordHash: 'hashed',
        },
      });

      await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: staffUser.id,
          role: 'STAFF',
        },
      });

      const staffToken = generateToken(staffUser.id, org.id, 'STAFF');

      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ plan: 'PROFESSIONAL' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/organizations/:orgId/billing/invoices', () => {
    test('should create invoice', async () => {
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post(`/api/organizations/${org.id}/billing/invoices`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 99,
          dueDate,
        });

      expect(response.status).toBe(201);
      expect(response.body.invoiceNumber).toBeDefined();
      expect(response.body.amount).toBe(99);
      expect(response.body.status).toBe('pending');
    });

    test('should use default amount from billing plan', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/billing/invoices`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe(99);
    });

    test('should require admin role', async () => {
      const staffUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff@test.com',
          name: 'Staff',
          passwordHash: 'hashed',
        },
      });

      await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: staffUser.id,
          role: 'STAFF',
        },
      });

      const staffToken = generateToken(staffUser.id, org.id, 'STAFF');

      const response = await request(app)
        .post(`/api/organizations/${org.id}/billing/invoices`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/billing/invoices', () => {
    beforeEach(async () => {
      await prisma.invoice.create({
        data: {
          billingId: org.billing.id,
          invoiceNumber: 'INV-001',
          amount: 99,
          status: 'paid',
          dueDate: new Date(),
          paidAt: new Date(),
        },
      });

      await prisma.invoice.create({
        data: {
          billingId: org.billing.id,
          invoiceNumber: 'INV-002',
          amount: 99,
          status: 'pending',
          dueDate: new Date(),
        },
      });
    });

    test('should list all invoices', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing/invoices`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing/invoices?status=paid`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('paid');
    });

    test('should filter pending invoices', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing/invoices?status=pending`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('pending');
    });
  });

  describe('Billing Plans', () => {
    test('STARTER plan should be default', async () => {
      expect(org.billing.plan).toBe('STARTER');
      expect(org.billing.monthlyCharge).toBe(99);
    });

    test('should support PROFESSIONAL plan', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          plan: 'PROFESSIONAL',
          monthlyCharge: 299,
        });

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('PROFESSIONAL');
    });

    test('should support ENTERPRISE plan', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          plan: 'ENTERPRISE',
          monthlyCharge: 999,
        });

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('ENTERPRISE');
    });
  });

  describe('Billing Status', () => {
    test('billing should be active by default', () => {
      expect(org.billing.isActive).toBe(true);
    });

    test('should be able to deactivate billing', async () => {
      await prisma.organizationBilling.update({
        where: { organizationId: org.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('Stripe integration', () => {
    test('should store stripe customer id', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/billing`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          stripeCustomerId: 'cus_ABC123',
        });

      expect(response.status).toBe(200);
      expect(response.body.stripeCustomerId).toBe('cus_ABC123');
    });
  });
});
