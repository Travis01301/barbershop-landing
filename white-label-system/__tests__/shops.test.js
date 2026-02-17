const request = require('supertest');
const { app, prisma } = require('../server/index');
const { generateToken } = require('../server/middleware/auth');

describe('Shop Provisioning', () => {
  let org, user, token;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: {
        name: 'Shop Test Org',
        email: 'shop@test.com',
        type: 'AGENCY',
        settings: { create: { appName: 'Shop Test' } },
      },
      include: { settings: true },
    });

    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashed',
      },
    });

    await prisma.organizationStaff.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'ADMIN',
      },
    });

    token = generateToken(user.id, org.id, 'ADMIN');
  });

  afterEach(async () => {
    await prisma.organizationShop.deleteMany();
    await prisma.organizationStaff.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizationSettings.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('POST /api/organizations/:orgId/shops', () => {
    test('should create a new shop', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/shops`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Downtown Location',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          phone: '(555) 123-4567',
          email: 'downtown@barbershop.com',
          capacity: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Downtown Location');
      expect(response.body.organizationId).toBe(org.id);
      expect(response.body.capacity).toBe(5);
    });

    test('should require shop name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/shops`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    test('should prevent duplicate shop email', async () => {
      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Existing Shop',
          email: 'existing@test.com',
        },
      });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/shops`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Duplicate',
          email: 'existing@test.com',
        });

      expect(response.status).toBe(409);
    });

    test('should require admin role', async () => {
      const staffUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff@test.com',
          name: 'Staff User',
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
        .post(`/api/organizations/${org.id}/shops`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Shop',
          email: 'unauth@test.com',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/shops', () => {
    beforeEach(async () => {
      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Shop 1',
          email: 'shop1@test.com',
          isActive: true,
        },
      });

      await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Shop 2',
          email: 'shop2@test.com',
          isActive: false,
        },
      });
    });

    test('should list all shops', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/shops`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    test('should filter by active status', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/shops?isActive=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].isActive).toBe(true);
    });

    test('should filter inactive shops', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/shops?isActive=false`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].isActive).toBe(false);
    });
  });

  describe('PATCH /api/organizations/:orgId/shops/:shopId', () => {
    let shop;

    beforeEach(async () => {
      shop = await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Original Name',
          email: 'original@test.com',
          capacity: 5,
        },
      });
    });

    test('should update shop details', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          capacity: 10,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
      expect(response.body.capacity).toBe(10);
    });

    test('should deactivate shop', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/organizations/:orgId/shops/:shopId', () => {
    let shop;

    beforeEach(async () => {
      shop = await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Shop to Delete',
          email: 'delete@test.com',
        },
      });
    });

    test('should soft delete shop', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${org.id}/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const updated = await prisma.organizationShop.findUnique({
        where: { id: shop.id },
      });

      expect(updated.isActive).toBe(false);
    });

    test('should require admin role', async () => {
      const staffUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff2@test.com',
          name: 'Staff User 2',
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
        .delete(`/api/organizations/${org.id}/shops/${shop.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Shop customization', () => {
    let shop;

    beforeEach(async () => {
      shop = await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Custom Shop',
          email: 'custom@test.com',
        },
      });
    });

    test('should allow per-shop branding overrides', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/shops/${shop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00',
        });

      expect(response.status).toBe(200);
      expect(response.body.primaryColor).toBe('#FF0000');
      expect(response.body.secondaryColor).toBe('#00FF00');
    });
  });
});
