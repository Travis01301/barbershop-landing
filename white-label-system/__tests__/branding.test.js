const request = require('supertest');
const { app, prisma } = require('../server/index');
const { generateToken } = require('../server/middleware/auth');

describe('Branding API', () => {
  let org, user, token;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: {
        name: 'Branding Test Org',
        email: 'branding@test.com',
        settings: { create: { appName: 'Test App' } },
      },
      include: { settings: true },
    });

    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: 'user@test.com',
        name: 'Test User',
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
    await prisma.organizationStaff.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizationSettings.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('GET /api/organizations/:orgId/settings', () => {
    test('should fetch organization settings', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.appName).toBe('Test App');
    });

    test('should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .get('/api/organizations/nonexistent/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/organizations/:orgId/settings', () => {
    test('should update app name', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({ appName: 'New App Name' });

      expect(response.status).toBe(200);
      expect(response.body.appName).toBe('New App Name');
    });

    test('should update brand colors', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          primaryColor: '#FF0000',
          secondaryColor: '#00FF00',
          accentColor: '#0000FF',
        });

      expect(response.status).toBe(200);
      expect(response.body.primaryColor).toBe('#FF0000');
      expect(response.body.secondaryColor).toBe('#00FF00');
      expect(response.body.accentColor).toBe('#0000FF');
    });

    test('should reject invalid hex color', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({ primaryColor: 'not-a-color' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    test('should update custom domain', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({ customDomain: 'mybarbershop.com' });

      expect(response.status).toBe(200);
      expect(response.body.customDomain).toBe('mybarbershop.com');
    });

    test('should reject invalid domain', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({ customDomain: 'invalid..domain' });

      expect(response.status).toBe(400);
    });

    test('should prevent duplicate domain', async () => {
      // Create another org with same domain
      const org2 = await prisma.organization.create({
        data: {
          name: 'Org 2',
          email: 'org2@test.com',
          settings: {
            create: {
              appName: 'Org 2',
              customDomain: 'taken.com',
            },
          },
        },
      });

      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({ customDomain: 'taken.com' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already in use');

      // Cleanup
      await prisma.organizationSettings.delete({
        where: { organizationId: org2.id },
      });
      await prisma.organization.delete({ where: { id: org2.id } });
    });

    test('should update welcome message and help text', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          welcomeMessage: 'Welcome to our barbershop!',
          helpText: 'Need help? Email us at support@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.welcomeMessage).toBe('Welcome to our barbershop!');
      expect(response.body.helpText).toBe('Need help? Email us at support@example.com');
    });

    test('should require admin role', async () => {
      // Create staff user with STAFF role
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
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ appName: 'Attempt' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/settings/public', () => {
    test('should return public branding settings without auth', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/settings/public`);

      expect(response.status).toBe(200);
      expect(response.body.appName).toBe('Test App');
      expect(response.body.primaryColor).toBeDefined();
    });

    test('should not expose sensitive settings', async () => {
      await prisma.organizationSettings.update({
        where: { organizationId: org.id },
        data: { supportEmail: 'secret@example.com' },
      });

      const response = await request(app)
        .get(`/api/organizations/${org.id}/settings/public`);

      expect(response.status).toBe(200);
      // supportEmail should not be in public response
      expect(response.body.supportEmail).toBeUndefined();
    });
  });

  describe('Font family selection', () => {
    test('should support multiple font families', async () => {
      const fonts = ['Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato'];

      for (const font of fonts) {
        const response = await request(app)
          .patch(`/api/organizations/${org.id}/settings`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fontFamily: font });

        expect(response.status).toBe(200);
        expect(response.body.fontFamily).toBe(font);
      }
    });
  });

  describe('Email domain configuration', () => {
    test('should update email domain', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          emailDomain: 'mail.mybarbershop.com',
          supportEmail: 'support@mybarbershop.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.emailDomain).toBe('mail.mybarbershop.com');
      expect(response.body.supportEmail).toBe('support@mybarbershop.com');
    });
  });

  describe('Feature flags', () => {
    test('should enable/disable features', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/settings`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          enableShopCustomization: false,
          enableAdvancedAnalytics: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.enableShopCustomization).toBe(false);
      expect(response.body.enableAdvancedAnalytics).toBe(true);
    });
  });
});
