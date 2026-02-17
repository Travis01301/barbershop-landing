// Integration Management API Tests
const request = require('supertest');
const { app, pool } = require('../../backend/server');

describe('Integration Management API', () => {
  const businessId = 'test-business-' + Date.now();
  let integrationId;

  afterAll(async () => {
    await pool.query('DELETE FROM integrations WHERE business_id = $1', [businessId]);
    await pool.end();
  });

  describe('POST /api/integrations', () => {
    it('should create a new integration', async () => {
      const res = await request(app)
        .post('/api/integrations')
        .set('X-Business-ID', businessId)
        .send({
          provider: 'google_calendar',
          config: {
            calendar_id: 'primary',
            timezone: 'America/New_York',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.integration.provider).toBe('google_calendar');
      expect(res.body.integration.status).toBe('inactive');

      integrationId = res.body.integration.id;
    });

    it('should require business ID', async () => {
      const res = await request(app)
        .post('/api/integrations')
        .send({
          provider: 'google_calendar',
          config: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should require provider', async () => {
      const res = await request(app)
        .post('/api/integrations')
        .set('X-Business-ID', businessId)
        .send({
          config: {},
        });

      expect(res.status).toBe(400);
    });

    it('should prevent duplicate provider per business', async () => {
      const res = await request(app)
        .post('/api/integrations')
        .set('X-Business-ID', businessId)
        .send({
          provider: 'google_calendar',
          config: {},
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('GET /api/integrations', () => {
    it('should list integrations for business', async () => {
      const res = await request(app)
        .get('/api/integrations')
        .set('X-Business-ID', businessId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.integrations)).toBe(true);
      expect(res.body.integrations.length).toBeGreaterThan(0);
    });

    it('should require business ID', async () => {
      const res = await request(app)
        .get('/api/integrations');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/integrations/:id', () => {
    it('should get integration details', async () => {
      const res = await request(app)
        .get(`/api/integrations/${integrationId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.integration.id).toBe(integrationId);
      expect(res.body.integration.provider).toBe('google_calendar');
    });

    it('should return 404 for nonexistent integration', async () => {
      const res = await request(app)
        .get('/api/integrations/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/integrations/:id', () => {
    it('should update integration config', async () => {
      const res = await request(app)
        .put(`/api/integrations/${integrationId}`)
        .send({
          config: {
            calendar_id: 'secondary',
            timezone: 'UTC',
          },
          webhook_url: 'https://example.com/webhook',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.integration.webhook_url).toBe('https://example.com/webhook');
    });

    it('should update enabled triggers', async () => {
      const res = await request(app)
        .put(`/api/integrations/${integrationId}`)
        .send({
          enabled_triggers: ['appointment_created', 'appointment_cancelled'],
        });

      expect(res.status).toBe(200);
      expect(res.body.integration.enabled_triggers).toContain('appointment_created');
    });
  });

  describe('POST /api/integrations/:id/disconnect', () => {
    it('should disconnect OAuth connection', async () => {
      const res = await request(app)
        .post(`/api/integrations/${integrationId}/disconnect`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify status is now inactive
      const checkRes = await request(app)
        .get(`/api/integrations/${integrationId}`);

      expect(checkRes.body.integration.status).toBe('inactive');
    });
  });

  describe('DELETE /api/integrations/:id', () => {
    it('should delete integration', async () => {
      // Create new integration to delete
      const createRes = await request(app)
        .post('/api/integrations')
        .set('X-Business-ID', businessId)
        .send({
          provider: 'shopify',
          config: { shop_domain: 'test.myshopify.com' },
        });

      const idToDelete = createRes.body.integration.id;

      const deleteRes = await request(app)
        .delete(`/api/integrations/${idToDelete}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deleted
      const checkRes = await request(app)
        .get(`/api/integrations/${idToDelete}`);

      expect(checkRes.status).toBe(404);
    });

    it('should return 404 when deleting nonexistent integration', async () => {
      const res = await request(app)
        .delete('/api/integrations/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });
});
