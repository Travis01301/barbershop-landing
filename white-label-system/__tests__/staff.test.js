const request = require('supertest');
const { app, prisma } = require('../server/index');
const { generateToken } = require('../server/middleware/auth');

describe('Staff Management', () => {
  let org, admin, token;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: {
        name: 'Staff Test Org',
        email: 'staff@test.com',
        type: 'AGENCY',
        settings: { create: { appName: 'Staff Test' } },
      },
      include: { settings: true },
    });

    admin = await prisma.user.create({
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
        userId: admin.id,
        role: 'ADMIN',
      },
    });

    token = generateToken(admin.id, org.id, 'ADMIN');
  });

  afterEach(async () => {
    await prisma.organizationInvitation.deleteMany();
    await prisma.organizationStaff.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organizationSettings.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('POST /api/organizations/:orgId/staff', () => {
    test('should send staff invitation', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newstaff@test.com',
          role: 'MANAGER',
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newstaff@test.com');
      expect(response.body.role).toBe('MANAGER');
      expect(response.body.token).toBeDefined();
      expect(response.body.isAccepted).toBe(false);
    });

    test('should require email', async () => {
      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'STAFF' });

      expect(response.status).toBe(400);
    });

    test('should prevent duplicate invitations', async () => {
      await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'duplicate@test.com',
          role: 'STAFF',
          token: 'token123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'duplicate@test.com',
          role: 'STAFF',
        });

      expect(response.status).toBe(409);
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
        .post(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'newstaff@test.com',
          role: 'MANAGER',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/staff', () => {
    beforeEach(async () => {
      const user1 = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'user1@test.com',
          name: 'User 1',
          passwordHash: 'hashed',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'user2@test.com',
          name: 'User 2',
          passwordHash: 'hashed',
        },
      });

      await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: user1.id,
          role: 'MANAGER',
        },
      });

      await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: user2.id,
          role: 'STAFF',
        },
      });
    });

    test('should list all staff members', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    test('should include user details', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/staff`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body[0].user).toBeDefined();
      expect(response.body[0].user.email).toBeDefined();
    });
  });

  describe('GET /api/organizations/:orgId/staff/invitations', () => {
    beforeEach(async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiredAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'pending@test.com',
          role: 'STAFF',
          token: 'token1',
          expiresAt,
        },
      });

      await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'expired@test.com',
          role: 'MANAGER',
          token: 'token2',
          expiresAt: expiredAt,
        },
      });
    });

    test('should list pending invitations', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/staff/invitations`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].email).toBe('pending@test.com');
    });

    test('should not include expired invitations', async () => {
      const response = await request(app)
        .get(`/api/organizations/${org.id}/staff/invitations`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const emails = response.body.map(inv => inv.email);
      expect(emails).not.toContain('expired@test.com');
    });
  });

  describe('PATCH /api/organizations/:orgId/staff/:staffId', () => {
    let staffMember;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff@test.com',
          name: 'Staff Member',
          passwordHash: 'hashed',
        },
      });

      staffMember = await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'STAFF',
        },
      });
    });

    test('should update staff role', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${org.id}/staff/${staffMember.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'MANAGER' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('MANAGER');
    });

    test('should assign shops to staff', async () => {
      const shop = await prisma.organizationShop.create({
        data: {
          organizationId: org.id,
          name: 'Test Shop',
          email: 'shop@test.com',
        },
      });

      const response = await request(app)
        .patch(`/api/organizations/${org.id}/staff/${staffMember.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ shopIds: [shop.id] });

      expect(response.status).toBe(200);
      expect(response.body.shopIds).toContain(shop.id);
    });
  });

  describe('DELETE /api/organizations/:orgId/staff/:staffId', () => {
    let staffMember;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: 'staff@test.com',
          name: 'Staff Member',
          passwordHash: 'hashed',
        },
      });

      staffMember = await prisma.organizationStaff.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'STAFF',
        },
      });
    });

    test('should remove staff member', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${org.id}/staff/${staffMember.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const deleted = await prisma.organizationStaff.findUnique({
        where: { id: staffMember.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Invitation acceptance', () => {
    test('should accept valid invitation', async () => {
      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'newmember@test.com',
          role: 'STAFF',
          token: 'valid-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff/invitations/${invitation.id}/accept`)
        .send({ token: 'valid-token-123' });

      expect(response.status).toBe(200);

      const updated = await prisma.organizationInvitation.findUnique({
        where: { id: invitation.id },
      });

      expect(updated.isAccepted).toBe(true);
      expect(updated.acceptedAt).toBeDefined();
    });

    test('should reject expired invitation', async () => {
      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'expired@test.com',
          role: 'STAFF',
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff/invitations/${invitation.id}/accept`)
        .send({ token: 'expired-token' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expired');
    });

    test('should reject invalid token', async () => {
      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: 'invalid@test.com',
          role: 'STAFF',
          token: 'correct-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post(`/api/organizations/${org.id}/staff/invitations/${invitation.id}/accept`)
        .send({ token: 'wrong-token' });

      expect(response.status).toBe(404);
    });
  });
});
