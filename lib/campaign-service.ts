import { Pool } from 'pg';
import { logger } from './logger';
import { getPool } from './db';
import { Resend } from 'resend';

const campaignLogger = logger.createChild('campaign-service');

const resend = new Resend(process.env.RESEND_API_KEY);

export interface Campaign {
  id: string;
  shop_id: string;
  name: string;
  campaign_type: 'promotion' | 'service_announcement' | 'reactivation' | 'custom';
  subject: string;
  preview_text?: string;
  html_content: string;
  plain_text_content?: string;
  sender_name?: string;
  sender_email: string;
  reply_to_email?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  scheduled_send_at?: Date;
  sent_at?: Date;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  total_bounced: number;
  a_b_test_enabled: boolean;
  a_b_test_variant?: string;
  notes?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignEmail {
  id: string;
  campaign_id: string;
  customer_id?: string;
  recipient_email: string;
  variant?: string;
  tracking_code: string;
  sent_at?: Date;
  delivered_at?: Date;
  bounced_at?: Date;
  bounce_type?: 'hard' | 'soft' | 'complaint';
  bounce_reason?: string;
  opened: boolean;
  opened_at?: Date;
  opened_count: number;
  clicked: boolean;
  clicked_at?: Date;
  clicked_count: number;
  clicked_links?: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'complaint';
  created_at: Date;
  updated_at: Date;
}

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  total_recipients: number;
  total_delivered: number;
  total_bounced: number;
  total_opened: number;
  total_clicked: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  conversion_count: number;
  conversion_value: number;
  revenue_generated: number;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignAutoTrigger {
  id: string;
  shop_id: string;
  campaign_id: string;
  trigger_name: string;
  trigger_type: 'no_book' | 'first_time' | 'birthday' | 'custom_event';
  trigger_condition: string;
  trigger_value?: number;
  trigger_unit?: 'days' | 'weeks' | 'months';
  enabled: boolean;
  last_triggered_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Redemption {
  id: string;
  campaign_id: string;
  campaign_email_id: string;
  customer_id?: string;
  coupon_code: string;
  discount_value?: number;
  discount_percent?: number;
  redeemed: boolean;
  redeemed_at?: Date;
  redeemed_order_id?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  shopId: string,
  data: Partial<Campaign>,
  userId?: string
): Promise<Campaign> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO campaigns
       (shop_id, name, campaign_type, subject, preview_text, html_content, plain_text_content, 
        sender_name, sender_email, reply_to_email, status, scheduled_send_at, a_b_test_enabled, 
        a_b_test_variant, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        shopId,
        data.name,
        data.campaign_type || 'custom',
        data.subject,
        data.preview_text || null,
        data.html_content,
        data.plain_text_content || null,
        data.sender_name || null,
        data.sender_email,
        data.reply_to_email || null,
        data.status || 'draft',
        data.scheduled_send_at || null,
        data.a_b_test_enabled || false,
        data.a_b_test_variant || null,
        data.notes || null,
        userId || null,
      ]
    );

    campaignLogger.info('Campaign created', {
      campaignId: result.rows[0].id,
      shopId,
    });

    return result.rows[0] as Campaign;
  } catch (error) {
    campaignLogger.error('Error creating campaign', error);
    throw new Error('Failed to create campaign');
  }
}

/**
 * Get campaigns for a shop
 */
export async function getCampaigns(
  shopId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ campaigns: Campaign[]; total: number }> {
  const pool = getPool();

  try {
    let query = 'SELECT * FROM campaigns WHERE shop_id = $1';
    let params: any[] = [shopId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    // Get total count
    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*) as total'),
      params
    );

    // Get campaigns
    const result = await pool.query(
      query + ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    return {
      campaigns: result.rows as Campaign[],
      total: countResult.rows[0].total,
    };
  } catch (error) {
    campaignLogger.error('Error getting campaigns', error);
    throw new Error('Failed to get campaigns');
  }
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  campaignId: string,
  data: Partial<Campaign>
): Promise<Campaign> {
  const pool = getPool();

  try {
    const updates: string[] = [];
    const values: any[] = [campaignId];
    let paramCount = 1;

    const fields = ['name', 'subject', 'html_content', 'status', 'notes', 'scheduled_send_at'];

    for (const field of fields) {
      if (field in data) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        values.push((data as any)[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const result = await pool.query(
      `UPDATE campaigns SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    campaignLogger.info('Campaign updated', {
      campaignId,
    });

    return result.rows[0] as Campaign;
  } catch (error) {
    campaignLogger.error('Error updating campaign', error);
    throw new Error('Failed to update campaign');
  }
}

/**
 * Send campaign to recipients
 */
export async function sendCampaign(
  campaignId: string,
  recipientEmails: string[]
): Promise<void> {
  const pool = getPool();

  try {
    // Get campaign
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = campaignResult.rows[0] as Campaign;

    // Update campaign status to sending
    await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2',
      ['sending', campaignId]
    );

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const email of recipientEmails) {
      try {
        const trackingCode = `${campaignId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Send email via Resend
        await resend.emails.send({
          from: campaign.sender_email,
          to: email,
          subject: campaign.subject,
          html: campaign.html_content.replace('{tracking_code}', trackingCode),
          replyTo: campaign.reply_to_email || undefined,
        });

        // Record email in database
        await pool.query(
          `INSERT INTO campaign_emails
           (campaign_id, recipient_email, tracking_code, sent_at, status)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'sent')`,
          [campaignId, email, trackingCode]
        );

        sentCount++;
      } catch (emailError) {
        campaignLogger.error('Error sending email', emailError);
        failedCount++;

        // Record failed email
        await pool.query(
          `INSERT INTO campaign_emails
           (campaign_id, recipient_email, status)
           VALUES ($1, $2, 'failed')`,
          [campaignId, email]
        );
      }
    }

    // Update campaign status
    await pool.query(
      `UPDATE campaigns 
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, total_sent = $1, total_failed = $2
       WHERE id = $3`,
      [sentCount, failedCount, campaignId]
    );

    campaignLogger.info('Campaign sent', {
      campaignId,
      sentCount,
      failedCount,
    });
  } catch (error) {
    campaignLogger.error('Error sending campaign', error);
    await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2',
      ['failed', campaignId]
    );
    throw new Error('Failed to send campaign');
  }
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT ca.* FROM campaign_analytics ca
       WHERE ca.campaign_id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      // Create analytics if doesn't exist
      return initializeCampaignAnalytics(campaignId);
    }

    return result.rows[0] as CampaignAnalytics;
  } catch (error) {
    campaignLogger.error('Error getting campaign analytics', error);
    throw new Error('Failed to get campaign analytics');
  }
}

/**
 * Initialize campaign analytics
 */
async function initializeCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO campaign_analytics
       (campaign_id, total_recipients, total_delivered, total_bounced, total_opened, total_clicked, 
        unique_opens, unique_clicks, open_rate, click_rate, bounce_rate, conversion_count, conversion_value, revenue_generated)
       VALUES ($1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       RETURNING *`,
      [campaignId]
    );

    return result.rows[0] as CampaignAnalytics;
  } catch (error) {
    campaignLogger.error('Error initializing analytics', error);
    throw new Error('Failed to initialize analytics');
  }
}

/**
 * Create auto-trigger rule
 */
export async function createAutoTrigger(
  shopId: string,
  data: Partial<CampaignAutoTrigger>
): Promise<CampaignAutoTrigger> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO campaign_auto_triggers
       (shop_id, campaign_id, trigger_name, trigger_type, trigger_condition, trigger_value, trigger_unit, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        shopId,
        data.campaign_id,
        data.trigger_name,
        data.trigger_type,
        data.trigger_condition,
        data.trigger_value || null,
        data.trigger_unit || null,
        data.enabled !== false,
      ]
    );

    campaignLogger.info('Auto-trigger created', {
      triggerId: result.rows[0].id,
      shopId,
    });

    return result.rows[0] as CampaignAutoTrigger;
  } catch (error) {
    campaignLogger.error('Error creating auto-trigger', error);
    throw new Error('Failed to create auto-trigger');
  }
}

/**
 * Create redemption code
 */
export async function createRedemptionCode(
  campaignId: string,
  campaignEmailId: string,
  couponCode: string,
  discountValue?: number,
  discountPercent?: number
): Promise<Redemption> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO campaign_redemptions
       (campaign_id, campaign_email_id, coupon_code, discount_value, discount_percent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [campaignId, campaignEmailId, couponCode, discountValue || null, discountPercent || null]
    );

    return result.rows[0] as Redemption;
  } catch (error) {
    campaignLogger.error('Error creating redemption code', error);
    throw new Error('Failed to create redemption code');
  }
}

/**
 * Redeem a coupon code
 */
export async function redeemCoupon(
  couponCode: string,
  orderId?: string
): Promise<Redemption> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `UPDATE campaign_redemptions
       SET redeemed = true, redeemed_at = CURRENT_TIMESTAMP, redeemed_order_id = $1
       WHERE coupon_code = $2
       RETURNING *`,
      [orderId || null, couponCode]
    );

    if (result.rows.length === 0) {
      throw new Error('Coupon code not found');
    }

    return result.rows[0] as Redemption;
  } catch (error) {
    campaignLogger.error('Error redeeming coupon', error);
    throw new Error('Failed to redeem coupon');
  }
}

/**
 * Add campaign segment
 */
export async function addCampaignSegment(
  campaignId: string,
  segmentName: string,
  segmentType: string,
  segmentValue?: string,
  segmentOperator?: string
): Promise<any> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `INSERT INTO campaign_segments
       (campaign_id, segment_name, segment_type, segment_value, segment_operator)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [campaignId, segmentName, segmentType, segmentValue || null, segmentOperator || null]
    );

    return result.rows[0];
  } catch (error) {
    campaignLogger.error('Error adding campaign segment', error);
    throw new Error('Failed to add campaign segment');
  }
}

/**
 * Track email open
 */
export async function trackEmailOpen(trackingCode: string): Promise<void> {
  const pool = getPool();

  try {
    await pool.query(
      `UPDATE campaign_emails
       SET opened = true, opened_at = CURRENT_TIMESTAMP, opened_count = opened_count + 1
       WHERE tracking_code = $1`,
      [trackingCode]
    );

    campaignLogger.debug('Email open tracked', { trackingCode });
  } catch (error) {
    campaignLogger.error('Error tracking email open', error);
  }
}

/**
 * Track email click
 */
export async function trackEmailClick(trackingCode: string, linkUrl: string): Promise<void> {
  const pool = getPool();

  try {
    const emailResult = await pool.query(
      `SELECT clicked_links FROM campaign_emails WHERE tracking_code = $1`,
      [trackingCode]
    );

    let links = emailResult.rows[0]?.clicked_links ? JSON.parse(emailResult.rows[0].clicked_links) : [];
    if (!links.includes(linkUrl)) {
      links.push(linkUrl);
    }

    await pool.query(
      `UPDATE campaign_emails
       SET clicked = true, clicked_at = CURRENT_TIMESTAMP, clicked_count = clicked_count + 1, clicked_links = $1
       WHERE tracking_code = $2`,
      [JSON.stringify(links), trackingCode]
    );

    campaignLogger.debug('Email click tracked', { trackingCode, linkUrl });
  } catch (error) {
    campaignLogger.error('Error tracking email click', error);
  }
}
