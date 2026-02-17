const request = require('supertest');
const { app, prisma } = require('../server/index');
const { generateToken } = require('../server/middleware/auth');

describe('Analytics', () => {
  let org, admin, token;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: {
        name: 'Analytics Test Org',
        email: 'analytics@test.com',
        type: 'CHAIN',
        settings: { create: { appName: 'Analytics Test' } },
        billing: {
          create: {
            plan: 'ENTERPRISE',
            monthlyCharge: 999,
            billingEmail: 'analytics@test.com',
            nextBillingDate: new Date(),
          },
        },
      },
      include: { settings: true, billing: true },
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
    await prisma.usageAnalytics.deleteMany();
    await prisma.organizationShop.deleteMany();
    await prisma.organizationBilling.deleteMany();
    await prisma.organizationStaff.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizationSettings.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('GET /api/organizations/:orgId/analytics', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.usageAnalytics.create({
        data: {
          organizationId: org.id,
          period: 'daily',
          date: today,
          totalAppointments: 10,
          totalRevenue: 500,
          activeCustomers: 25,
          activeStaff: 5,
        },
      });

      await prisma.usageAnalytics.create({
        data: {
          organizationId: org.id,
          period: 'daily',
          date: yesterday,
          totalAppointments: 8,
          totalRevenue: 400,
          activeCustomers: 20,
          activeStaff: 4,
        },
      });
    });

    test('should fetch analytics data', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.analytics).toBeDefined();
      expect(response.body.period).toBe('monthly');
    });

    test('should include summary stats', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalAppointments).toBeGreaterThan(0);
      expect(response.body.summary.totalRevenue).toBeGreaterThan(0);
      expect(response.body.summary.activeCustomers).toBeGreaterThan(0);
    });

    test('should filter by period', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics?period=daily`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('daily');
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics?limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.analytics.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/organizations/:orgId/analytics/summary', () => {
    beforeEach(async () => {
      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Shop 1',
          email: 'shop1@test.com',
        },
      });

      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Shop 2',
          email: 'shop2@test.com',
        },
      });

      await prisma.usageAnalytics.create({
        data: {
          organizationId: org.id,
          period: 'daily',
          date: new Date(),
          totalAppointments: 20,
          totalRevenue: 1000,
          activeCustomers: 50,
          activeStaff: 10,
        },
      });
    });

    test('should return quick summary', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics/summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.activeShops).toBe(2);
      expect(response.body.totalAppointments).toBe(20);
      expect(response.body.totalRevenue).toBe(1000);
    });

    test('should count active shops only', async () => {
      await prisma.organizationShop.update({
        where: { organizationId: org.id, name: 'Shop 1' },
        data: { isActive: false },
      });

      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics/summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.activeShops).toBe(1);
    });
  });

  describe('GET /api/organizations/:orgId/analytics/shops', () => {
    beforeEach(async () => {
      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Downtown Shop',
          city: 'New York',
          email: 'downtown@test.com',
        },
      });

      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Uptown Shop',
          city: 'New York',
          email: 'uptown@test.com',
        },
      });
    });

    test('should list shops for analytics', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics/shops`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[0].id).toBeDefined();
    });

    test('should only include active shops', async () => {
      const shop = await prisma.organizationShop.findFirst({
        where: { organizationId: org.id },
      });

      await prisma.organizationShop.update({
        where: { id: shop.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get(`/api/organizations/${org.id}/analytics/shops`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('POST /api/organizations/:orgId/analytics/record', () => {
    test('should record appointment metric', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'appointment',
          value: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.totalAppointments).toBe(1);
    });

    test('should record revenue metric', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'revenue',
          value: 150,
        });

      expect(response.status).toBe(200);
      expect(response.body.totalRevenue).toBe(150);
    });

    test('should track active customers', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'customer',
          value: 25,
        });

      expect(response.status).toBe(200);
      expect(response.body.activeCustomers).toBe(25);
    });

    test('should track active staff', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'staff',
          value: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.activeStaff).toBe(5);
    });

    test('should aggregate metrics within same day', async () => {
      await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'appointment', value: 1 });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'appointment', value: 1 });

      expect(response.status).toBe(200);
      expect(response.body.totalAppointments).toBe(2);
    });

    test('should reject invalid metric', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'invalid_metric',
          value: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    test('should accept custom date', async () => {
      const customDate = new Date('2024-01-15');

      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          metric: 'appointment',
          value: 5,
          date: customDate.toISOString(),
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Revenue tracking', () => {
    test('should accumulate revenue over time', async () => {
      await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'revenue', value: 100 });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'revenue', value: 150 });

      expect(response.status).toBe(200);
      expect(response.body.totalRevenue).toBe(250);
    });
  });

  describe('Staff capacity tracking', () => {
    test('should track peak staff numbers', async () => {
      await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'staff', value: 3 });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/analytics/record`)
        .set('Authorization', `Bearer ${token}`)
        .send({ metric: 'staff', value: 5 });

      // Should track the maximum
      expect(response.body.activeStaff).toBe(5);
    });
  });
});
