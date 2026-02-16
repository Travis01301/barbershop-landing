import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const serviceLogger = logger.createChild('sms-marketing-service');

// Twilio client type (will be initialized with actual SDK)
let twilioClient: any = null;

/**
 * Initialize Twilio client
 */
export function initTwilio(accountSid: string, authToken: string) {
  try {
    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    serviceLogger.info('Twilio client initialized');
  } catch (error) {
    serviceLogger.error('Failed to initialize Twilio', error);
  }
}

export interface SMSCampaign {
  id: number;
  shop_id: number;
  campaign_name: string;
  campaign_type: string;
  message_content: string;
  sender_id?: string;
  scheduled_time?: string;
  send_now: boolean;
  is_active: boolean;
  status: 'draft' | 'scheduled' | 'sent' | 'paused' | 'cancelled';
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface SMSSegment {
  id: number;
  shop_id: number;
  segment_name: string;
  segment_type: string;
  criteria: any;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface SMSMessage {
  id: number;
  shop_id: number;
  campaign_id: number;
  customer_id: number;
  phone_number: string;
  message_content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  twilio_sid?: string;
  error_code?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  is_unsubscribed: boolean;
  created_at: string;
}

export interface SMSAnalytics {
  id: number;
  shop_id: number;
  campaign_id: number;
  metric_date: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_bounced: number;
  delivery_rate: number;
  failure_rate: number;
  conversion_count: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

const RATE_LIMIT = 100; // messages per second (Twilio tier dependent)
const RATE_LIMIT_WINDOW = 1000; // milliseconds

let messageQueue: any[] = [];
let lastSendTime = 0;

/**
 * Send SMS with rate limiting
 */
async function sendSMSWithRateLimit(
  phone_number: string,
  message: string,
  from_number: string
): Promise<any> {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  // Rate limiting logic
  const now = Date.now();
  if (now - lastSendTime < RATE_LIMIT_WINDOW / RATE_LIMIT) {
    const waitTime = RATE_LIMIT_WINDOW / RATE_LIMIT - (now - lastSendTime);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastSendTime = Date.now();

  return twilioClient.messages.create({
    body: message,
    from: from_number,
    to: phone_number,
  });
}

export const smsMarketingService = {
  // ============ CAMPAIGNS ============

  /**
   * Create a new SMS campaign
   */
  async createCampaign(
    shop_id: number,
    campaign_name: string,
    campaign_type: string,
    message_content: string,
    opts: {
      scheduled_time?: Date;
      send_now?: boolean;
      sender_id?: string;
      created_by?: number;
    } = {}
  ): Promise<SMSCampaign> {
    try {
      const result = await query(
        `INSERT INTO sms_campaigns (
          shop_id, campaign_name, campaign_type, message_content,
          sender_id, scheduled_time, send_now, status,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          campaign_name,
          campaign_type,
          message_content,
          opts.sender_id || null,
          opts.scheduled_time || null,
          opts.send_now || false,
          'draft',
          opts.created_by || null,
        ]
      );

      serviceLogger.info('SMS campaign created', {
        campaign_name,
        campaign_type,
      });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create SMS campaign', error);
      throw error;
    }
  },

  /**
   * Get campaigns for a shop
   */
  async getCampaigns(
    shop_id: number,
    opts?: { status?: string }
  ): Promise<SMSCampaign[]> {
    try {
      let sql = `SELECT * FROM sms_campaigns WHERE shop_id = $1`;
      const params: any[] = [shop_id];

      if (opts?.status) {
        sql += ` AND status = $${params.length + 1}`;
        params.push(opts.status);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch SMS campaigns', error);
      throw error;
    }
  },

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaign_id: number): Promise<SMSCampaign | null> {
    try {
      const result = await query(
        'SELECT * FROM sms_campaigns WHERE id = $1',
        [campaign_id]
      );
      return result.rows[0] || null;
    } catch (error) {
      serviceLogger.error('Failed to fetch SMS campaign', error);
      throw error;
    }
  },

  /**
   * Update campaign
   */
  async updateCampaign(
    campaign_id: number,
    updates: Partial<SMSCampaign>
  ): Promise<SMSCampaign> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'shop_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      fields.push(`updated_at = NOW()`);
      values.push(campaign_id);

      const result = await query(
        `UPDATE sms_campaigns SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        throw new Error('Campaign not found');
      }

      serviceLogger.info('SMS campaign updated', { campaign_id });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to update SMS campaign', error);
      throw error;
    }
  },

  // ============ SEGMENTS ============

  /**
   * Create a customer segment
   */
  async createSegment(
    shop_id: number,
    segment_name: string,
    segment_type: string,
    criteria: any
  ): Promise<SMSSegment> {
    try {
      // Calculate customer count based on criteria
      const customer_count = await this.calculateSegmentSize(shop_id, segment_type, criteria);

      const result = await query(
        `INSERT INTO sms_segments (
          shop_id, segment_name, segment_type, criteria,
          customer_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          segment_name,
          segment_type,
          JSON.stringify(criteria),
          customer_count,
        ]
      );

      serviceLogger.info('SMS segment created', { segment_name, segment_type });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create SMS segment', error);
      throw error;
    }
  },

  /**
   * Get segments for a shop
   */
  async getSegments(shop_id: number): Promise<SMSSegment[]> {
    try {
      const result = await query(
        `SELECT * FROM sms_segments WHERE shop_id = $1 ORDER BY segment_name ASC`,
        [shop_id]
      );
      return result.rows.map((row) => ({
        ...row,
        criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
      }));
    } catch (error) {
      serviceLogger.error('Failed to fetch SMS segments', error);
      throw error;
    }
  },

  /**
   * Calculate segment size based on criteria
   */
  async calculateSegmentSize(
    shop_id: number,
    segment_type: string,
    criteria: any
  ): Promise<number> {
    try {
      let sql = `SELECT COUNT(DISTINCT c.id) as count FROM customers c
        WHERE c.shop_id = $1 AND c.phone_number IS NOT NULL`;
      const params: any[] = [shop_id];

      // Exclude unsubscribed customers
      sql += ` AND NOT EXISTS (
        SELECT 1 FROM sms_unsubscribes su WHERE su.customer_id = c.id AND su.shop_id = $1
      )`;

      if (segment_type === 'service_based' && criteria.service_id) {
        sql += ` AND EXISTS (
          SELECT 1 FROM appointments a WHERE a.customer_id = c.id
          AND a.service_id = $${params.length + 1}
        )`;
        params.push(criteria.service_id);
      } else if (segment_type === 'frequency' && criteria.min_visits) {
        sql += ` AND (
          SELECT COUNT(*) FROM appointments a WHERE a.customer_id = c.id
        ) >= $${params.length + 1}`;
        params.push(criteria.min_visits);
      } else if (segment_type === 'vip' && criteria.lifetime_spend) {
        sql += ` AND (
          SELECT SUM(total_amount) FROM appointments a WHERE a.customer_id = c.id AND a.status = 'completed'
        ) >= $${params.length + 1}`;
        params.push(criteria.lifetime_spend);
      }

      const result = await query(sql, params);
      return parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      serviceLogger.error('Failed to calculate segment size', error);
      return 0;
    }
  },

  // ============ SENDING ============

  /**
   * Send campaign to selected segments
   */
  async sendCampaign(
    campaign_id: number,
    segment_ids: number[],
    twilio_from_number: string
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    try {
      const campaign = await this.getCampaignById(campaign_id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const shopId = campaign.shop_id;
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      // Get customers for the selected segments
      let segmentSql =
        'SELECT DISTINCT c.id, c.phone_number FROM customers c WHERE c.shop_id = $1 AND (';
      const params: any[] = [shopId];

      segment_ids.forEach((segmentId, index) => {
        if (index > 0) segmentSql += ' OR ';
        segmentSql += `c.id IN (
          SELECT customer_id FROM appointments a
          WHERE a.shop_id = $${params.length + 1}
        )`;
        params.push(shopId);
      });

      segmentSql +=
        ') AND c.phone_number IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sms_unsubscribes su WHERE su.customer_id = c.id AND su.shop_id = $1)';

      const customersResult = await query(segmentSql, params);
      const customers = customersResult.rows;

      // Send to each customer
      for (const customer of customers) {
        try {
          // Check if already unsubscribed
          const unsubscribeCheck = await query(
            `SELECT id FROM sms_unsubscribes WHERE customer_id = $1 AND shop_id = $2`,
            [customer.id, shopId]
          );

          if (unsubscribeCheck.rows.length > 0) {
            skipped++;
            continue;
          }

          // Send SMS
          const twilioResponse = await sendSMSWithRateLimit(
            customer.phone_number,
            campaign.message_content,
            twilio_from_number
          );

          // Record message
          await query(
            `INSERT INTO sms_messages (
              shop_id, campaign_id, customer_id, phone_number,
              message_content, status, twilio_sid, sent_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              shopId,
              campaign_id,
              customer.id,
              customer.phone_number,
              campaign.message_content,
              'sent',
              twilioResponse.sid,
            ]
          );

          sent++;
        } catch (error) {
          failed++;
          serviceLogger.error('Failed to send SMS to customer', {
            customer_id: customer.id,
            error,
          });

          // Record failed message
          await query(
            `INSERT INTO sms_messages (
              shop_id, campaign_id, customer_id, phone_number,
              message_content, status, error_message, failed_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
            [
              shopId,
              campaign_id,
              customer.id,
              customer.phone_number,
              campaign.message_content,
              'failed',
              error instanceof Error ? error.message : 'Unknown error',
            ]
          );
        }
      }

      // Update campaign statistics
      await query(
        `UPDATE sms_campaigns
        SET total_recipients = $1, total_sent = $2,
            status = 'sent', updated_at = NOW()
        WHERE id = $3`,
        [sent + failed + skipped, sent, campaign_id]
      );

      serviceLogger.info('Campaign sent', {
        campaign_id,
        sent,
        failed,
        skipped,
      });

      return { sent, failed, skipped };
    } catch (error) {
      serviceLogger.error('Failed to send campaign', error);
      throw error;
    }
  },

  /**
   * Schedule a campaign to send at a specific time
   */
  async scheduleCampaign(
    campaign_id: number,
    scheduled_time: Date
  ): Promise<SMSCampaign> {
    try {
      const result = await query(
        `UPDATE sms_campaigns
        SET scheduled_time = $1, status = 'scheduled', updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
        [scheduled_time, campaign_id]
      );

      if (!result.rows[0]) {
        throw new Error('Campaign not found');
      }

      serviceLogger.info('Campaign scheduled', { campaign_id, scheduled_time });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to schedule campaign', error);
      throw error;
    }
  },

  // ============ ANALYTICS ============

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaign_id: number): Promise<SMSAnalytics[]> {
    try {
      const result = await query(
        `SELECT * FROM sms_analytics WHERE campaign_id = $1
        ORDER BY metric_date DESC`,
        [campaign_id]
      );
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch campaign analytics', error);
      throw error;
    }
  },

  /**
   * Update message delivery status (called from webhook)
   */
  async updateMessageStatus(
    twilio_sid: string,
    status: string,
    error_code?: string
  ): Promise<void> {
    try {
      const statusMap: { [key: string]: string } = {
        delivered: 'delivered',
        failed: 'failed',
        undelivered: 'bounced',
        sent: 'sent',
      };

      const mappedStatus = statusMap[status] || status;

      await query(
        `UPDATE sms_messages
        SET status = $1, delivered_at = NOW(), error_code = $2, updated_at = NOW()
        WHERE twilio_sid = $3`,
        [mappedStatus, error_code || null, twilio_sid]
      );

      serviceLogger.info('Message status updated', { twilio_sid, status: mappedStatus });
    } catch (error) {
      serviceLogger.error('Failed to update message status', error);
      throw error;
    }
  },

  /**
   * Record campaign conversion
   */
  async recordConversion(campaign_id: number, appointment_id: number): Promise<void> {
    try {
      // Update message to mark conversion
      await query(
        `UPDATE sms_messages
        SET status = 'delivered'
        WHERE campaign_id = $1 AND id IN (
          SELECT sm.id FROM sms_messages sm
          JOIN appointments a ON a.customer_id = sm.customer_id
          WHERE sm.campaign_id = $1 AND a.id = $2
        )`,
        [campaign_id, appointment_id]
      );

      serviceLogger.info('Conversion recorded', { campaign_id, appointment_id });
    } catch (error) {
      serviceLogger.error('Failed to record conversion', error);
      throw error;
    }
  },

  // ============ UNSUBSCRIBE ============

  /**
   * Add customer to unsubscribe list
   */
  async unsubscribeCustomer(
    shop_id: number,
    customer_id: number,
    phone_number: string,
    reason?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO sms_unsubscribes (
          shop_id, customer_id, phone_number, unsubscribe_reason, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (shop_id, customer_id) DO NOTHING`,
        [shop_id, customer_id, phone_number, reason || null]
      );

      // Mark existing messages as unsubscribed
      await query(
        `UPDATE sms_messages
        SET is_unsubscribed = true
        WHERE customer_id = $1 AND shop_id = $2`,
        [customer_id, shop_id]
      );

      serviceLogger.info('Customer unsubscribed from SMS', {
        customer_id,
        phone_number,
      });
    } catch (error) {
      serviceLogger.error('Failed to unsubscribe customer', error);
      throw error;
    }
  },

  /**
   * Check if customer is unsubscribed
   */
  async isUnsubscribed(shop_id: number, customer_id: number): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM sms_unsubscribes
        WHERE shop_id = $1 AND customer_id = $2`,
        [shop_id, customer_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      serviceLogger.error('Failed to check unsubscribe status', error);
      return true; // Default to unsubscribed on error
    }
  },

  // ============ AUTO-TRIGGERS ============

  /**
   * Create an auto-trigger rule
   */
  async createAutoTrigger(
    shop_id: number,
    trigger_name: string,
    trigger_type: string,
    message_template: string,
    trigger_criteria: any
  ): Promise<any> {
    try {
      const result = await query(
        `INSERT INTO sms_auto_triggers (
          shop_id, trigger_name, trigger_type, message_template,
          trigger_criteria, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          trigger_name,
          trigger_type,
          message_template,
          JSON.stringify(trigger_criteria),
          true,
        ]
      );

      serviceLogger.info('Auto-trigger created', {
        trigger_name,
        trigger_type,
      });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create auto-trigger', error);
      throw error;
    }
  },

  /**
   * Get auto-triggers for a shop
   */
  async getAutoTriggers(shop_id: number): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM sms_auto_triggers WHERE shop_id = $1 AND is_active = true
        ORDER BY trigger_type ASC`,
        [shop_id]
      );
      return result.rows.map((row) => ({
        ...row,
        trigger_criteria:
          typeof row.trigger_criteria === 'string'
            ? JSON.parse(row.trigger_criteria)
            : row.trigger_criteria,
      }));
    } catch (error) {
      serviceLogger.error('Failed to fetch auto-triggers', error);
      throw error;
    }
  },

  /**
   * Trigger anniversary message for customers
   */
  async triggerAnniversaryMessages(shop_id: number): Promise<number> {
    try {
      const today = new Date();
      const triggers = await this.getAutoTriggers(shop_id);
      const anniversaryTrigger = triggers.find((t) => t.trigger_type === 'anniversary');

      if (!anniversaryTrigger) {
        return 0;
      }

      // Find customers who had their first visit this day of the year
      const customersResult = await query(
        `SELECT DISTINCT c.id, c.phone_number FROM customers c
        WHERE c.shop_id = $1
        AND MONTH(c.created_at) = $2 AND DAY(c.created_at) = $3
        AND c.phone_number IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM sms_unsubscribes su WHERE su.customer_id = c.id)`,
        [shop_id, today.getMonth() + 1, today.getDate()]
      );

      let sentCount = 0;
      for (const customer of customersResult.rows) {
        try {
          // Create and send campaign
          const campaign = await this.createCampaign(
            shop_id,
            `Anniversary Message for ${customer.id}`,
            'auto_trigger',
            anniversaryTrigger.message_template,
            { send_now: true }
          );

          // Send the message
          if (twilioClient) {
            const response = await sendSMSWithRateLimit(
              customer.phone_number,
              anniversaryTrigger.message_template,
              'BarberShop'
            );

            await query(
              `INSERT INTO sms_messages (
                shop_id, campaign_id, customer_id, phone_number,
                message_content, status, twilio_sid, sent_at, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
              [
                shop_id,
                campaign.id,
                customer.id,
                customer.phone_number,
                anniversaryTrigger.message_template,
                'sent',
                response.sid,
              ]
            );

            sentCount++;
          }
        } catch (error) {
          serviceLogger.error('Failed to send anniversary message', error);
        }
      }

      serviceLogger.info('Anniversary messages triggered', { shop_id, sentCount });
      return sentCount;
    } catch (error) {
      serviceLogger.error('Failed to trigger anniversary messages', error);
      return 0;
    }
  },
};
