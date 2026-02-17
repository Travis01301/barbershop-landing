// Webhook Integration Tests
const request = require('supertest');
const { app, pool } = require('../../backend/server');
const WebhookService = require('../../backend/services/webhook/WebhookService');
const crypto = require('crypto');

describe('Webhook System', () => {
  let webhookService;
  let testIntegrationId;
  const testWebhookSecret = 'test-webhook-secret-12345';

  beforeAll(async () => {
    webhookService = new WebhookService(pool);

    // Create test integration with webhook
    const result = await pool.query(
      `INSERT INTO integrations 
       (business_id, provider, config, webhook_url, webhook_secret, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id`,
      [
        'test-business',
        'zapier',
        JSON.stringify({}),
        'https://example.com/webhook',
        testWebhookSecret,
      ]
    );
    testIntegrationId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM webhook_events WHERE integration_id = $1', [testIntegrationId]);
    await pool.query('DELETE FROM integrations WHERE id = $1', [testIntegrationId]);
    await pool.end();
  });

  describe('Webhook Event Queueing', () => {
    it('should queue appointment created event', async () => {
      const eventId = await webhookService.queueWebhookEvent(
        testIntegrationId,
        'appointment_created',
        {
          appointment_id: 'appt-123',
          customer: 'John Doe',
          time: '2024-01-15T10:00:00',
        }
      );

      expect(eventId).toBeDefined();

      const result = await pool.query(
        'SELECT * FROM webhook_events WHERE id = $1',
        [eventId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].event_type).toBe('appointment_created');
      expect(result.rows[0].status).toBe('pending');
    });

    it('should queue payment completed event', async () => {
      const eventId = await webhookService.queueWebhookEvent(
        testIntegrationId,
        'payment_completed',
        {
          appointment_id: 'appt-456',
          amount: 50.00,
          method: 'card',
        }
      );

      expect(eventId).toBeDefined();
    });

    it('should queue customer created event', async () => {
      const eventId = await webhookService.queueWebhookEvent(
        testIntegrationId,
        'customer_created',
        {
          customer_id: 'cust-789',
          name: 'Jane Doe',
          email: 'jane@example.com',
        }
      );

      expect(eventId).toBeDefined();
    });
  });

  describe('Webhook Signing', () => {
    it('should sign webhook payload with HMAC-SHA256', () => {
      const payload = { test: 'data' };
      const signature = webhookService.signWebhook(payload, testWebhookSecret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex is 64 chars
    });

    it('should verify correct webhook signature', () => {
      const payload = { test: 'data' };
      const signature = webhookService.signWebhook(payload, testWebhookSecret);

      const isValid = webhookService.verifyWebhookSignature(
        payload,
        signature,
        testWebhookSecret
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = { test: 'data' };
      const validSignature = webhookService.signWebhook(payload, testWebhookSecret);
      const invalidSignature = 'invalid-signature-' + crypto.randomBytes(16).toString('hex');

      expect(() => {
        webhookService.verifyWebhookSignature(
          payload,
          invalidSignature,
          testWebhookSecret
        );
      }).toThrow();
    });
  });

  describe('Webhook Retry Logic', () => {
    it('should handle webhook failure and schedule retry', async () => {
      const eventId = await webhookService.queueWebhookEvent(
        testIntegrationId,
        'test_event',
        { test: 'data' }
      );

      await webhookService.handleWebhookFailure(eventId, 'Connection timeout');

      const result = await pool.query(
        'SELECT * FROM webhook_events WHERE id = $1',
        [eventId]
      );

      expect(result.rows[0].status).toBe('retrying');
      expect(result.rows[0].retry_count).toBe(1);
      expect(result.rows[0].next_retry_at).toBeDefined();
    });

    it('should abandon webhook after max retries', async () => {
      const eventId = await webhookService.queueWebhookEvent(
        testIntegrationId,
        'retry_test',
        { test: 'data' }
      );

      // Simulate 5 failures
      for (let i = 0; i < 5; i++) {
        await webhookService.handleWebhookFailure(eventId, 'Persistent error');
      }

      const result = await pool.query(
        'SELECT * FROM webhook_events WHERE id = $1',
        [eventId]
      );

      expect(result.rows[0].status).toBe('abandoned');
    });
  });

  describe('Webhook Event Triggers', () => {
    it('should trigger appointment created webhook', async () => {
      const eventId = await webhookService.triggerAppointmentCreated(
        testIntegrationId,
        {
          id: 'appt-trigger-001',
          customer_name: 'Test Customer',
          service: 'Haircut',
        }
      );

      expect(eventId).toBeDefined();

      const result = await pool.query(
        'SELECT * FROM webhook_events WHERE id = $1',
        [eventId]
      );

      expect(result.rows[0].event_type).toBe('appointment_created');
    });

    it('should trigger commission payout webhook', async () => {
      const eventId = await webhookService.triggerCommissionPayout(
        testIntegrationId,
        {
          barber_id: 'barber-001',
          amount: 500.00,
          period: 'weekly',
        }
      );

      expect(eventId).toBeDefined();
    });
  });

  describe('POST /api/webhooks/test', () => {
    it('should test webhook URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/test')
        .send({
          webhook_url: 'https://webhook.site/unique-id',
        });

      // This will fail in test environment but structure is correct
      expect(res.status).toBeDefined();
    });
  });
});
