// Webhook Service - Handles outgoing webhooks with retry logic
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
  constructor(pool) {
    this.pool = pool;
    this.maxRetries = 5;
    this.retryDelays = [1000, 5000, 30000, 300000, 3600000]; // 1s, 5s, 30s, 5m, 1h
  }

  /**
   * Queue webhook event
   */
  async queueWebhookEvent(integrationId, eventType, payload) {
    const result = await this.pool.query(
      `INSERT INTO webhook_events 
       (integration_id, event_type, payload, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [integrationId, eventType, JSON.stringify(payload)]
    );

    return result.rows[0].id;
  }

  /**
   * Send webhook event
   */
  async sendWebhook(integrationId, eventId) {
    const eventResult = await this.pool.query(
      `SELECT * FROM webhook_events WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      throw new Error('Webhook event not found');
    }

    const event = eventResult.rows[0];

    // Get integration info
    const integrationResult = await this.pool.query(
      `SELECT * FROM integrations WHERE id = $1`,
      [integrationId]
    );

    if (integrationResult.rows.length === 0) {
      throw new Error('Integration not found');
    }

    const integration = integrationResult.rows[0];

    if (!integration.webhook_url) {
      console.warn(`No webhook URL configured for integration ${integrationId}`);
      return;
    }

    try {
      // Sign webhook
      const signature = this.signWebhook(event.payload, integration.webhook_secret);

      // Send webhook
      await axios.post(integration.webhook_url, event.payload, {
        headers: {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.event_type,
          'X-Webhook-ID': event.id,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      // Mark as delivered
      await this.pool.query(
        `UPDATE webhook_events 
         SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [eventId]
      );

      console.log(`Webhook delivered: ${event.id}`);
    } catch (error) {
      console.error(`Error sending webhook ${eventId}:`, error.message);

      // Handle retry
      await this.handleWebhookFailure(eventId, error.message);
    }
  }

  /**
   * Handle webhook failure and schedule retry
   */
  async handleWebhookFailure(eventId, errorMessage) {
    const result = await this.pool.query(
      `SELECT retry_count, max_retries FROM webhook_events WHERE id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) return;

    const event = result.rows[0];
    const retryCount = event.retry_count + 1;

    if (retryCount >= event.max_retries) {
      // Max retries exceeded
      await this.pool.query(
        `UPDATE webhook_events 
         SET status = 'abandoned', last_error = $1, updated_at = NOW()
         WHERE id = $2`,
        [errorMessage, eventId]
      );

      console.warn(`Webhook ${eventId} abandoned after ${retryCount} retries`);
    } else {
      // Schedule retry
      const nextRetryDelay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
      const nextRetryTime = new Date(Date.now() + nextRetryDelay);

      await this.pool.query(
        `UPDATE webhook_events 
         SET status = 'retrying', retry_count = $1, next_retry_at = $2, 
             last_error = $3, updated_at = NOW()
         WHERE id = $4`,
        [retryCount, nextRetryTime, errorMessage, eventId]
      );

      console.log(`Webhook ${eventId} scheduled for retry at ${nextRetryTime}`);
    }
  }

  /**
   * Process pending webhooks (cron job)
   */
  async processPendingWebhooks() {
    const result = await this.pool.query(
      `SELECT id, integration_id FROM webhook_events 
       WHERE status IN ('pending', 'retrying') 
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       LIMIT 100`
    );

    for (const event of result.rows) {
      try {
        await this.sendWebhook(event.integration_id, event.id);
      } catch (error) {
        console.error(`Error processing webhook ${event.id}:`, error);
      }
    }

    return result.rows.length;
  }

  /**
   * Sign webhook payload
   */
  signWebhook(payload, secret) {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature (for incoming webhooks)
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.signWebhook(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Trigger outgoing webhook events
   */
  async triggerAppointmentCreated(integrationId, appointment) {
    return this.queueWebhookEvent(integrationId, 'appointment_created', {
      timestamp: new Date(),
      appointment,
    });
  }

  async triggerAppointmentCancelled(integrationId, appointmentId) {
    return this.queueWebhookEvent(integrationId, 'appointment_cancelled', {
      timestamp: new Date(),
      appointment_id: appointmentId,
    });
  }

  async triggerPaymentCompleted(integrationId, paymentData) {
    return this.queueWebhookEvent(integrationId, 'payment_completed', {
      timestamp: new Date(),
      payment: paymentData,
    });
  }

  async triggerCustomerCreated(integrationId, customer) {
    return this.queueWebhookEvent(integrationId, 'customer_created', {
      timestamp: new Date(),
      customer,
    });
  }

  async triggerReviewSubmitted(integrationId, review) {
    return this.queueWebhookEvent(integrationId, 'review_submitted', {
      timestamp: new Date(),
      review,
    });
  }

  async triggerCommissionPayout(integrationId, payout) {
    return this.queueWebhookEvent(integrationId, 'commission_payout', {
      timestamp: new Date(),
      payout,
    });
  }
}

module.exports = WebhookService;
