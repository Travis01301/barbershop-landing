import { logger } from './logger';
import { query, getClient } from './db';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

const promoLogger = logger.createChild('promo-service');

// ============ Types ============

export interface PromoCode {
  id: number;
  code: string;
  discountPercent: number;
  durationMonths: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  stripeCouponId: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  description: string | null;
}

export interface PromoCodeUsage {
  id: number;
  codeId: number;
  shopId: number;
  subscriptionId: string | null;
  redeemedAt: string;
  discountApplied: number;
  discountEndAt: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  code?: PromoCode;
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  code?: PromoCode;
  discountApplied?: number;
  discountEndDate?: string;
  stripeCouponId?: string;
  error?: string;
}

export interface AnalyticsData {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  totalDiscountApplied: number;
  codes: Array<{
    code: string;
    discountPercent: number;
    usedCount: number;
    maxUses: number | null;
    isActive: boolean;
    expiresAt: string | null;
    redemptions: number;
    totalDiscountGiven: number;
  }>;
}

// ============ Promo Service ============

class PromoService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    });
  }

  /**
   * Create a new promo code
   */
  async createPromoCode(
    code: string,
    discountPercent: number,
    durationMonths: number,
    maxUses?: number,
    expiresAt?: string,
    description?: string,
    createdBy?: number
  ): Promise<PromoCode> {
    const client = await getClient();
    promoLogger.debug('Creating promo code', { code, discountPercent, durationMonths });

    try {
      // Normalize code to uppercase
      const normalizedCode = code.toUpperCase().trim();

      // Check if code already exists
      const existingRes = await client.query(
        'SELECT id FROM promo_codes WHERE code = $1',
        [normalizedCode]
      );

      if (existingRes.rows.length > 0) {
        throw new Error('Promo code already exists');
      }

      // Create Stripe coupon
      const stripeCoupon = await this.stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'limited', // limited duration for 6-month discount
        duration_in_months: durationMonths,
        metadata: {
          code: normalizedCode,
          internal_code: true,
        },
      });

      // Insert promo code
      const result = await client.query(
        `INSERT INTO promo_codes 
         (code, discount_percent, duration_months, max_uses, expires_at, created_by, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          normalizedCode,
          discountPercent,
          durationMonths,
          maxUses || null,
          expiresAt || null,
          createdBy || null,
          description || null,
        ]
      );

      // Update with Stripe coupon ID
      await client.query(
        'UPDATE promo_codes SET stripe_coupon_id = $1 WHERE id = $2',
        [stripeCoupon.id, result.rows[0].id]
      );

      const promoCode = this.mapPromoCode(result.rows[0]);
      promoLogger.info('Promo code created successfully', {
        code: normalizedCode,
        stripeCouponId: stripeCoupon.id,
      });

      return { ...promoCode, stripe_coupon_id: stripeCoupon.id };
    } finally {
      client.release();
    }
  }

  /**
   * Validate a promo code
   */
  async validatePromoCode(code: string, shopId?: number): Promise<ValidationResult> {
    const normalizedCode = code.toUpperCase().trim();
    promoLogger.debug('Validating promo code', { code: normalizedCode, shopId });

    try {
      const result = await query(
        'SELECT * FROM promo_codes WHERE code = $1',
        [normalizedCode]
      );

      if (result.rows.length === 0) {
        return { isValid: false, reason: 'Promo code not found' };
      }

      const promoCode = this.mapPromoCode(result.rows[0]);

      // Check if active
      if (!promoCode.isActive) {
        return { isValid: false, reason: 'Promo code is inactive' };
      }

      // Check expiration
      if (promoCode.expiresAt) {
        const expiresAt = new Date(promoCode.expiresAt);
        if (expiresAt < new Date()) {
          return { isValid: false, reason: 'Promo code has expired' };
        }
      }

      // Check usage limits
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return { isValid: false, reason: 'Promo code has reached maximum usage limit' };
      }

      // Check if shop already has an active promo code
      if (shopId) {
        const shopPromoRes = await query(
          `SELECT active_promo_code_id FROM shops 
           WHERE id = $1 AND active_promo_code_id IS NOT NULL`,
          [shopId]
        );

        if (shopPromoRes.rows.length > 0) {
          const existingPromoId = shopPromoRes.rows[0].active_promo_code_id;
          if (existingPromoId !== promoCode.id) {
            return { isValid: false, reason: 'Shop already has an active promo code' };
          }
        }
      }

      promoLogger.debug('Promo code validation successful', { code: normalizedCode });
      return { isValid: true, code: promoCode };
    } catch (error) {
      promoLogger.error('Error validating promo code', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Redeem a promo code for a shop
   */
  async redeemPromoCode(
    code: string,
    shopId: number,
    subscriptionId?: string
  ): Promise<RedemptionResult> {
    const client = await getClient();
    const normalizedCode = code.toUpperCase().trim();

    promoLogger.debug('Redeeming promo code', {
      code: normalizedCode,
      shopId,
      subscriptionId,
    });

    try {
      // Validate code
      const validation = await this.validatePromoCode(normalizedCode, shopId);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.reason || 'Invalid promo code',
          error: validation.reason,
        };
      }

      const promoCode = validation.code!;

      // Check if this shop already redeemed this code
      const existingUsageRes = await client.query(
        'SELECT id FROM promo_code_usage WHERE code_id = $1 AND shop_id = $2',
        [promoCode.id, shopId]
      );

      if (existingUsageRes.rows.length > 0) {
        promoLogger.warn('Duplicate redemption attempt', {
          code: normalizedCode,
          shopId,
        });
        return {
          success: false,
          message: 'This shop has already redeemed this promo code',
          error: 'DUPLICATE_REDEMPTION',
        };
      }

      // Calculate discount end date
      const now = new Date();
      const discountEndDate = new Date(
        now.getFullYear(),
        now.getMonth() + promoCode.durationMonths,
        now.getDate()
      );

      // If subscription exists, apply coupon in Stripe
      if (subscriptionId && promoCode.stripeCouponId) {
        try {
          await this.applyStripeDiscount(subscriptionId, promoCode.stripeCouponId);
          promoLogger.debug('Stripe discount applied', {
            subscriptionId,
            couponId: promoCode.stripeCouponId,
          });
        } catch (stripeError) {
          promoLogger.warn('Failed to apply Stripe discount', stripeError);
          // Continue with redemption even if Stripe fails
        }
      }

      // Record usage
      const usage = await client.query(
        `INSERT INTO promo_code_usage 
         (code_id, shop_id, subscription_id, discount_applied, discount_end_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          promoCode.id,
          shopId,
          subscriptionId || null,
          (promoCode.discountPercent / 100) * 39, // Assuming base price is $39/month
          discountEndDate.toISOString(),
        ]
      );

      // Update shop with active promo code
      await client.query(
        `UPDATE shops 
         SET active_promo_code_id = $1, 
             promo_discount_percent = $2, 
             promo_expires_at = $3
         WHERE id = $4`,
        [promoCode.id, promoCode.discountPercent, discountEndDate.toISOString(), shopId]
      );

      // Increment usage count
      await client.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [
        promoCode.id,
      ]);

      promoLogger.info('Promo code redeemed successfully', {
        code: normalizedCode,
        shopId,
        discountApplied: usage.rows[0].discount_applied,
      });

      return {
        success: true,
        message: 'Promo code redeemed successfully',
        code: promoCode,
        discountApplied: usage.rows[0].discount_applied,
        discountEndDate: discountEndDate.toISOString(),
        stripeCouponId: promoCode.stripeCouponId || undefined,
      };
    } catch (error) {
      promoLogger.error('Error redeeming promo code', error);
      return {
        success: false,
        message: 'Failed to redeem promo code',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      client.release();
    }
  }

  /**
   * Apply Stripe coupon to subscription
   */
  private async applyStripeDiscount(
    subscriptionId: string,
    couponId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        coupon: couponId,
      });

      promoLogger.debug('Stripe coupon applied', {
        subscriptionId,
        couponId,
        discountId: subscription.discount?.id,
      });

      return subscription;
    } catch (error) {
      promoLogger.error('Failed to apply Stripe coupon', error);
      throw error;
    }
  }

  /**
   * Get promo code analytics
   */
  async getAnalytics(): Promise<AnalyticsData> {
    promoLogger.debug('Fetching promo code analytics');

    try {
      const codesRes = await query('SELECT * FROM promo_codes ORDER BY created_at DESC');
      const usageRes = await query(
        `SELECT code_id, COUNT(*) as redemptions, SUM(discount_applied) as total_discount
         FROM promo_code_usage
         GROUP BY code_id`
      );

      const usageMap = new Map(
        usageRes.rows.map((row: any) => [row.code_id, { redemptions: row.redemptions, totalDiscount: row.total_discount }])
      );

      const codes = codesRes.rows.map((row: any) => {
        const usage = usageMap.get(row.id) || { redemptions: 0, totalDiscount: 0 };
        return {
          code: row.code,
          discountPercent: row.discount_percent,
          usedCount: row.used_count,
          maxUses: row.max_uses,
          isActive: row.is_active,
          expiresAt: row.expires_at,
          redemptions: usage.redemptions || 0,
          totalDiscountGiven: usage.totalDiscount || 0,
        };
      });

      const totalRedemptions = usageRes.rows.reduce((sum: number, row: any) => sum + parseInt(row.redemptions || 0), 0);
      const totalDiscountApplied = usageRes.rows.reduce(
        (sum: number, row: any) => sum + (parseFloat(row.total_discount) || 0),
        0
      );

      promoLogger.debug('Analytics generated', {
        totalCodes: codesRes.rows.length,
        activeCodes: codesRes.rows.filter((c: any) => c.is_active).length,
        totalRedemptions,
        totalDiscountApplied,
      });

      return {
        totalCodes: codesRes.rows.length,
        activeCodes: codesRes.rows.filter((c: any) => c.is_active).length,
        totalRedemptions,
        totalDiscountApplied,
        codes,
      };
    } catch (error) {
      promoLogger.error('Error fetching analytics', error);
      throw error;
    }
  }

  /**
   * Update a promo code
   */
  async updatePromoCode(
    id: number,
    updates: {
      discountPercent?: number;
      durationMonths?: number;
      maxUses?: number;
      isActive?: boolean;
      expiresAt?: string;
      description?: string;
    }
  ): Promise<PromoCode> {
    const client = await getClient();
    promoLogger.debug('Updating promo code', { id, updates });

    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.discountPercent !== undefined) {
        setClause.push(`discount_percent = $${paramIndex++}`);
        values.push(updates.discountPercent);
      }

      if (updates.durationMonths !== undefined) {
        setClause.push(`duration_months = $${paramIndex++}`);
        values.push(updates.durationMonths);
      }

      if (updates.maxUses !== undefined) {
        setClause.push(`max_uses = $${paramIndex++}`);
        values.push(updates.maxUses);
      }

      if (updates.isActive !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      if (updates.expiresAt !== undefined) {
        setClause.push(`expires_at = $${paramIndex++}`);
        values.push(updates.expiresAt || null);
      }

      if (updates.description !== undefined) {
        setClause.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(id);

      const result = await client.query(
        `UPDATE promo_codes 
         SET ${setClause.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Promo code not found');
      }

      promoLogger.info('Promo code updated successfully', { id });
      return this.mapPromoCode(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a promo code
   */
  async deletePromoCode(id: number): Promise<void> {
    const client = await getClient();
    promoLogger.debug('Deleting promo code', { id });

    try {
      const result = await client.query('DELETE FROM promo_codes WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new Error('Promo code not found');
      }

      promoLogger.info('Promo code deleted successfully', { id });
    } finally {
      client.release();
    }
  }

  /**
   * Get promo code by ID
   */
  async getPromoCodeById(id: number): Promise<PromoCode | null> {
    try {
      const result = await query('SELECT * FROM promo_codes WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapPromoCode(result.rows[0]) : null;
    } catch (error) {
      promoLogger.error('Error fetching promo code', error);
      return null;
    }
  }

  /**
   * Get all promo codes
   */
  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      const result = await query('SELECT * FROM promo_codes ORDER BY created_at DESC');
      return result.rows.map((row: any) => this.mapPromoCode(row));
    } catch (error) {
      promoLogger.error('Error fetching promo codes', error);
      return [];
    }
  }

  /**
   * Remove expired promo codes and clear expired discounts from shops
   */
  async cleanupExpiredCodes(): Promise<number> {
    const client = await getClient();
    promoLogger.debug('Cleaning up expired promo codes');

    try {
      // Find shops with expired promo codes
      const expiredRes = await client.query(
        `SELECT id FROM promo_codes 
         WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = true`
      );

      const expiredCodeIds = expiredRes.rows.map((row: any) => row.id);

      if (expiredCodeIds.length === 0) {
        return 0;
      }

      // Deactivate expired codes
      await client.query(
        `UPDATE promo_codes 
         SET is_active = false 
         WHERE id = ANY($1)`,
        [expiredCodeIds]
      );

      // Remove promo codes from shops where discount has ended
      await client.query(
        `UPDATE shops 
         SET active_promo_code_id = NULL, 
             promo_discount_percent = NULL, 
             promo_expires_at = NULL
         WHERE promo_expires_at IS NOT NULL AND promo_expires_at < NOW()`
      );

      promoLogger.info('Expired promo codes cleaned up', {
        count: expiredCodeIds.length,
      });

      return expiredCodeIds.length;
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to PromoCode interface
   */
  private mapPromoCode(row: any): PromoCode {
    return {
      id: row.id,
      code: row.code,
      discountPercent: parseFloat(row.discount_percent),
      durationMonths: row.duration_months,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      stripeCouponId: row.stripe_coupon_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      description: row.description,
    };
  }
}

// Export singleton instance
export const promoService = new PromoService();

export default promoService;
