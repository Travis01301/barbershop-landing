// OAuth Integration Tests
const request = require('supertest');
const { app, pool } = require('../../backend/server');
const OAuthManager = require('../../backend/services/oauth/OAuthManager');

describe('OAuth Integration', () => {
  let oauthManager;

  beforeAll(() => {
    oauthManager = new OAuthManager(pool, process.env.ENCRYPTION_KEY || 'test-key');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/oauth/authorize/:provider', () => {
    it('should return authorization URL for Google Calendar', async () => {
      const res = await request(app)
        .post('/api/oauth/authorize/google_calendar')
        .set('X-Business-ID', 'test-business-123')
        .send({ redirect_uri: 'http://localhost:3000/oauth/callback' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.auth_url).toBeDefined();
      expect(res.body.state).toBeDefined();
    });

    it('should return 400 if business ID is missing', async () => {
      const res = await request(app)
        .post('/api/oauth/authorize/google_calendar')
        .send({ redirect_uri: 'http://localhost:3000/oauth/callback' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return authorization URL for Outlook', async () => {
      const res = await request(app)
        .post('/api/oauth/authorize/outlook_calendar')
        .set('X-Business-ID', 'test-business-123')
        .send({ redirect_uri: 'http://localhost:3000/oauth/callback' });

      expect(res.status).toBe(200);
      expect(res.body.auth_url).toContain('login.microsoftonline.com');
    });
  });

  describe('POST /api/oauth/callback/:provider', () => {
    it('should handle OAuth callback and create connection', async () => {
      // Create test integration first
      const integrationRes = await request(app)
        .post('/api/integrations')
        .set('X-Business-ID', 'test-business-123')
        .send({
          provider: 'google_calendar',
          config: { calendar_id: 'primary' },
        });

      const integrationId = integrationRes.body.integration.id;

      const res = await request(app)
        .post('/api/oauth/callback/google_calendar')
        .send({
          code: 'test-auth-code',
          state: 'test-state',
          integration_id: integrationId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/oauth/callback/google_calendar')
        .send({ code: 'test-code' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/oauth/status/:provider', () => {
    it('should check OAuth connection status', async () => {
      const res = await request(app)
        .get('/api/oauth/status/google_calendar')
        .set('X-Integration-ID', 'test-integration-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('connected');
    });

    it('should return false if not connected', async () => {
      const res = await request(app)
        .get('/api/oauth/status/google_calendar')
        .set('X-Integration-ID', 'nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
    });
  });

  describe('OAuth Token Encryption', () => {
    it('should encrypt and decrypt tokens', () => {
      const testToken = 'super-secret-access-token-12345';
      const encrypted = oauthManager.encryptToken(testToken);
      const decrypted = oauthManager.decryptToken(encrypted);

      expect(encrypted).not.toBe(testToken);
      expect(decrypted).toBe(testToken);
    });

    it('should handle different tokens independently', () => {
      const token1 = 'token-one';
      const token2 = 'token-two';
      const encrypted1 = oauthManager.encryptToken(token1);
      const encrypted2 = oauthManager.encryptToken(token2);

      expect(encrypted1).not.toBe(encrypted2);
      expect(oauthManager.decryptToken(encrypted1)).toBe(token1);
      expect(oauthManager.decryptToken(encrypted2)).toBe(token2);
    });
  });
});
