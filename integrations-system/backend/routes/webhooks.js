// Webhook Routes
const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  /**
   * POST /api/webhooks/:provider
   * Receive incoming webhooks from providers
   */
  router.post('/:provider', async (req, res) => {
    try {
      const { provider } = req.params;
      const integrationId = req.headers['x-integration-id'];
      const signature = req.headers['x-webhook-signature'];

      if (!integrationId) {
        return res.status(400).json({ error: 'Missing x-integration-id header' });
      }

      // Get integration to verify signature
      const integrationResult = await pool.query(
        `SELECT webhook_secret FROM integrations WHERE id = $1`,
        [integrationId]
      );

      if (integrationResult.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Verify webhook signature (depending on provider)
      // This would use provider-specific verification methods

      // Log webhook event
      await pool.query(
        `INSERT INTO integration_logs 
         (integration_id, event_type, action, status, request_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          integrationId,
          'webhook',
          `${provider}_incoming`,
          'received',
          JSON.stringify(req.body),
        ]
      );

      // Route based on provider and event type
      await handleWebhookByProvider(provider, integrationId, req.body, pool);

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/webhooks/test
   * Test webhook URL
   */
  router.post('/test', async (req, res) => {
    try {
      const { webhook_url } = req.body;

      if (!webhook_url) {
        return res.status(400).json({ error: 'Missing webhook_url' });
      }

      // Send test payload
      const axios = require('axios');
      const testPayload = {
        event_type: 'test',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook',
      };

      await axios.post(webhook_url, testPayload, { timeout: 5000 });

      res.json({
        success: true,
        message: 'Webhook test successful',
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({ 
        error: 'Webhook test failed', 
        message: error.message 
      });
    }
  });

  /**
   * GET /api/webhooks/:integration_id/events
   * Get recent webhook events
   */
  router.get('/:integration_id/events', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM webhook_events 
         WHERE integration_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [req.params.integration_id]
      );

      res.json({
        success: true,
        events: result.rows,
      });
    } catch (error) {
      console.error('Error fetching webhook events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

/**
 * Handle incoming webhooks based on provider
 */
async function handleWebhookByProvider(provider, integrationId, payload, pool) {
  switch (provider) {
    case 'google_calendar':
      await handleGoogleCalendarWebhook(integrationId, payload, pool);
      break;
    case 'outlook_calendar':
      await handleOutlookWebhook(integrationId, payload, pool);
      break;
    case 'shopify':
      await handleShopifyWebhook(integrationId, payload, pool);
      break;
    default:
      console.warn(`Unknown webhook provider: ${provider}`);
  }
}

async function handleGoogleCalendarWebhook(integrationId, payload, pool) {
  // Handle Google Calendar push notifications
  console.log('Google Calendar webhook:', payload);
}

async function handleOutlookWebhook(integrationId, payload, pool) {
  // Handle Outlook/Microsoft Graph webhooks
  console.log('Outlook webhook:', payload);
}

async function handleShopifyWebhook(integrationId, payload, pool) {
  // Handle Shopify webhooks
  console.log('Shopify webhook:', payload);
}
