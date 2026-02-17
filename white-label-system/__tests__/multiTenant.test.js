const request = require('supertest');
const { app, prisma } = require('../server/index');
const { extractSubdomain } = require('../server/middleware/multiTenant');

describe('Multi-Tenant Routing', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        type TEXT DEFAULT 'SINGLE_SHOP',
        phone TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('extractSubdomain', () => {
    test('should extract subdomain from multi-level domain', () => {
      expect(extractSubdomain('acme.barbershop.com')).toBe('acme');
    });

    test('should return null for single domain', () => {
      expect(extractSubdomain('barbershop.com')).toBeNull();
    });

    test('should return null for localhost', () => {
      expect(extractSubdomain('localhost:3000')).toBeNull();
    });

    test('should return null for IP address', () => {
      expect(extractSubdomain('127.0.0.1:3000')).toBeNull();
    });

    test('should handle www prefix correctly', () => {
      const result = extractSubdomain('www.barbershop.com');
      expect(result).toBeNull();
    });
  });

  describe('Organization Resolution by Domain', () => {
    let testOrg;

    beforeEach(async () => {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Org',
          email: 'test@example.com',
          type: 'AGENCY',
          settings: {
            create: {
              appName: 'Test App',
              customDomain: 'test.barbershop.com',
            },
          },
        },
        include: { settings: true },
      });
    });

    afterEach(async () => {
      await prisma.organization.deleteMany();
      await prisma.organizationSettings.deleteMany();
    });

    test('should resolve org by custom domain in query param', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .query({ org: testOrg.id });
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testOrg.id);
    });

    test('should resolve org by header', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('X-Organization-ID', testOrg.id);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testOrg.id);
    });

    test('should fail without organization context', async () => {
      const response = await request(app)
        .get('/api/organizations/nonexistent/settings');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    let org1, org2;

    beforeEach(async () => {
      org1 = await prisma.organization.create({
        data: {
          name: 'Org 1',
          email: 'org1@example.com',
          settings: { create: { appName: 'Org 1 App' } },
        },
        include: { settings: true },
      });

      org2 = await prisma.organization.create({
        data: {
          name: 'Org 2',
          email: 'org2@example.com',
          settings: { create: { appName: 'Org 2 App' } },
        },
        include: { settings: true },
      });

      await prisma.organizationShop.create({
        data: {
          organizationId: org1.id,
          name: 'Org1 Shop',
          email: 'org1shop@example.com',
        },
      });

      await prisma.organizationShop.create({
        data: {
          organizationId: org2.id,
          name: 'Org2 Shop',
          email: 'org2shop@example.com',
        },
      });
    });

    afterEach(async () => {
      await prisma.organizationShop.deleteMany();
      await prisma.organization.deleteMany();
      await prisma.organizationSettings.deleteMany();
    });

    test('org1 should not see org2 shops', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org1.id}/shops`)
        .set('X-Organization-ID', org1.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Org1 Shop');
    });

    test('org2 should not see org1 shops', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org2.id}/shops`)
        .set('X-Organization-ID', org2.id);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Org2 Shop');
    });
  });
});
