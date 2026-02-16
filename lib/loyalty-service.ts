import { query, getClient } from './db';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

const serviceLogger = logger.createChild('loyalty-service');

/**
 * Loyalty & Referral Program Service
 * Handles points earning, redemption, and referral rewards
 */

export interface LoyaltyTransaction {
  id: number;
  shop_id: number;
  customer_id: number;
  appointment_id: number | null;
  transaction_type: 'earn' | 'redeem' | 'referral_reward' | 'admin_adjustment';
  points_amount: number;
  amount_usd: number | null;
  description: string | null;
  created_at: string;
}

export interface ReferralReward {
  id: number;
  shop_id: number;
  referrer_customer_id: number;
  referee_customer_id: number;
  referral_code: string;
  reward_amount: number;
  reward_credited_to_referrer: boolean;
  reward_credited_to_referee: boolean;
  referee_first_appointment_id: number | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Earn loyalty points from appointment
 * $1 spent = 1 point
 */
export async function earnLoyaltyPoints(
  data: {
    customerId: number;
    shopId: number;
    appointmentId: number;
    amount: number;
  }
): Promise<LoyaltyTransaction | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const points = data.amount; // 1 point per dollar

    // Add transaction
    const result = await client.query(
      `INSERT INTO loyalty_transactions (
        shop_id, customer_id, appointment_id, transaction_type,
        points_amount, amount_usd, description
      ) VALUES ($1, $2, $3, 'earn', $4, $5, $6)
      RETURNING *`,
      [
        data.shopId,
        data.customerId,
        data.appointmentId,
        points,
        data.amount,
        `Points earned from appointment #${data.appointmentId}`,
      ]
    );

    // Update customer loyalty points
    await client.query(
      `UPDATE customer_profiles
       SET loyalty_points = loyalty_points + $1, total_spent = total_spent + $2
       WHERE id = $3 AND shop_id = $4`,
      [points, data.amount, data.customerId, data.shopId]
    );

    await client.query('COMMIT');
    serviceLogger.info('Loyalty points earned', {
      customerId: data.customerId,
      points,
    });

    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to earn loyalty points', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Redeem loyalty points for discount
 * 10 points = $1 off
 */
export async function redeemLoyaltyPoints(
  data: {
    customerId: number;
    shopId: number;
    pointsToRedeem: number;
    appointmentId: number;
  }
): Promise<{ transaction: LoyaltyTransaction; discountAmount: number } | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Check customer has enough points
    const customerResult = await client.query(
      `SELECT loyalty_points FROM customer_profiles
       WHERE id = $1 AND shop_id = $2`,
      [data.customerId, data.shopId]
    );

    if (customerResult.rowCount === 0) {
      throw new Error('Customer not found');
    }

    const currentPoints = parseFloat(customerResult.rows[0].loyalty_points);

    if (currentPoints < data.pointsToRedeem) {
      throw new Error(`Insufficient points. Available: ${currentPoints}`);
    }

    // Calculate discount (10 points = $1)
    const discountAmount = data.pointsToRedeem / 10;

    // Add transaction
    const result = await client.query(
      `INSERT INTO loyalty_transactions (
        shop_id, customer_id, appointment_id, transaction_type,
        points_amount, amount_usd, description
      ) VALUES ($1, $2, $3, 'redeem', $4, $5, $6)
      RETURNING *`,
      [
        data.shopId,
        data.customerId,
        data.appointmentId,
        -data.pointsToRedeem,
        discountAmount,
        `Redeemed ${data.pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
      ]
    );

    // Update customer loyalty points
    await client.query(
      `UPDATE customer_profiles
       SET loyalty_points = loyalty_points - $1
       WHERE id = $2 AND shop_id = $3`,
      [data.pointsToRedeem, data.customerId, data.shopId]
    );

    await client.query('COMMIT');
    serviceLogger.info('Loyalty points redeemed', {
      customerId: data.customerId,
      pointsRedeemed: data.pointsToRedeem,
      discountAmount,
    });

    return { transaction: result.rows[0], discountAmount };
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to redeem loyalty points', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get customer loyalty balance
 */
export async function getLoyaltyBalance(
  customerId: number,
  shopId: number
): Promise<{ points: number; redeemedValue: number } | null> {
  try {
    const result = await query(
      `SELECT loyalty_points, total_spent FROM customer_profiles
       WHERE id = $1 AND shop_id = $2`,
      [customerId, shopId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const points = parseFloat(result.rows[0].loyalty_points);
    const redeemedValue = (points / 10); // 10 points = $1

    return { points, redeemedValue };
  } catch (error) {
    serviceLogger.error('Failed to get loyalty balance', error);
    throw error;
  }
}

/**
 * Generate unique referral code for customer
 */
export async function generateReferralCode(
  customerId: number,
  shopId: number
): Promise<string | null> {
  try {
    // Check if customer already has a code
    const existing = await query(
      `SELECT referral_code FROM customer_profiles
       WHERE id = $1 AND shop_id = $2`,
      [customerId, shopId]
    );

    if (existing.rows[0]?.referral_code) {
      return existing.rows[0].referral_code;
    }

    // Generate unique code (first 8 chars of UUID)
    const code = `REF-${uuidv4().substring(0, 8).toUpperCase()}`;

    await query(
      `UPDATE customer_profiles
       SET referral_code = $1
       WHERE id = $2 AND shop_id = $3`,
      [code, customerId, shopId]
    );

    serviceLogger.info('Referral code generated', { customerId, code });
    return code;
  } catch (error) {
    serviceLogger.error('Failed to generate referral code', error);
    throw error;
  }
}

/**
 * Validate referral code and get referrer info
 */
export async function validateReferralCode(
  code: string,
  shopId: number
): Promise<{ customerId: number; name: string; email: string } | null> {
  try {
    const result = await query(
      `SELECT id, name, email FROM customer_profiles
       WHERE referral_code = $1 AND shop_id = $2`,
      [code, shopId]
    );

    return result.rows[0] || null;
  } catch (error) {
    serviceLogger.error('Failed to validate referral code', error);
    throw error;
  }
}

/**
 * Apply referral reward when referee books first appointment
 * Both referrer and referee get $5 credit
 */
export async function applyReferralReward(
  data: {
    referralCode: string;
    refereeCustomerId: number;
    shopId: number;
    appointmentId: number;
  }
): Promise<ReferralReward | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get referrer info
    const referrerResult = await client.query(
      `SELECT id FROM customer_profiles
       WHERE referral_code = $1 AND shop_id = $2`,
      [data.referralCode, data.shopId]
    );

    if (referrerResult.rowCount === 0) {
      throw new Error('Invalid referral code');
    }

    const referrerId = referrerResult.rows[0].id;

    // Check if reward already applied
    const existing = await client.query(
      `SELECT id FROM referral_rewards
       WHERE referrer_customer_id = $1 AND referee_customer_id = $2 AND shop_id = $3`,
      [referrerId, data.refereeCustomerId, data.shopId]
    );

    if (existing.rowCount > 0) {
      throw new Error('Referral reward already applied');
    }

    // Create reward record
    const result = await client.query(
      `INSERT INTO referral_rewards (
        shop_id, referrer_customer_id, referee_customer_id,
        referral_code, reward_amount, referee_first_appointment_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [data.shopId, referrerId, data.refereeCustomerId, data.referralCode, 5.00, data.appointmentId]
    );

    // Add $5 credit to both customers as loyalty points
    // $5 = 50 points (at 10 points per $1)
    const rewardPoints = 50;

    await client.query(
      `UPDATE customer_profiles
       SET loyalty_points = loyalty_points + $1
       WHERE id = $2 AND shop_id = $3`,
      [rewardPoints, referrerId, data.shopId]
    );

    await client.query(
      `UPDATE customer_profiles
       SET loyalty_points = loyalty_points + $1
       WHERE id = $2 AND shop_id = $3`,
      [rewardPoints, data.refereeCustomerId, data.shopId]
    );

    // Log transactions
    await client.query(
      `INSERT INTO loyalty_transactions (
        shop_id, customer_id, transaction_type, points_amount,
        amount_usd, description
      ) VALUES ($1, $2, 'referral_reward', $3, $4, $5)`,
      [data.shopId, referrerId, rewardPoints, 5.00, 'Referral reward - referred customer booked']
    );

    await client.query(
      `INSERT INTO loyalty_transactions (
        shop_id, customer_id, transaction_type, points_amount,
        amount_usd, description
      ) VALUES ($1, $2, 'referral_reward', $3, $4, $5)`,
      [data.shopId, data.refereeCustomerId, rewardPoints, 5.00, 'Referral reward - booked from referral']
    );

    // Mark reward as credited
    await client.query(
      `UPDATE referral_rewards
       SET reward_credited_to_referrer = true, reward_credited_to_referee = true,
       completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [result.rows[0].id]
    );

    await client.query('COMMIT');
    serviceLogger.info('Referral reward applied', {
      referrerId,
      refereeId: data.refereeCustomerId,
    });

    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to apply referral reward', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get referral stats for customer
 */
export async function getReferralStats(
  customerId: number,
  shopId: number
): Promise<{
  referralCode: string | null;
  totalReferrals: number;
  activeReferrals: number;
  totalRewardEarned: number;
} | null> {
  try {
    const result = await query(
      `SELECT
        cp.referral_code,
        COUNT(CASE WHEN rr.completed_at IS NOT NULL THEN 1 END) as completed_referrals,
        COUNT(CASE WHEN rr.completed_at IS NULL THEN 1 END) as active_referrals,
        COALESCE(SUM(CASE WHEN lt.transaction_type = 'referral_reward' THEN lt.amount_usd ELSE 0 END), 0) as total_reward
      FROM customer_profiles cp
      LEFT JOIN referral_rewards rr ON cp.id = rr.referrer_customer_id AND rr.shop_id = cp.shop_id
      LEFT JOIN loyalty_transactions lt ON cp.id = lt.customer_id AND lt.transaction_type = 'referral_reward' AND lt.shop_id = cp.shop_id
      WHERE cp.id = $1 AND cp.shop_id = $2
      GROUP BY cp.referral_code`,
      [customerId, shopId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      referralCode: row.referral_code,
      totalReferrals: parseInt(row.completed_referrals) + parseInt(row.active_referrals),
      activeReferrals: parseInt(row.active_referrals),
      totalRewardEarned: parseFloat(row.total_reward),
    };
  } catch (error) {
    serviceLogger.error('Failed to get referral stats', error);
    throw error;
  }
}

/**
 * Get loyalty transaction history
 */
export async function getLoyaltyHistory(
  customerId: number,
  shopId: number,
  limit = 50
): Promise<LoyaltyTransaction[]> {
  try {
    const result = await query(
      `SELECT * FROM loyalty_transactions
       WHERE customer_id = $1 AND shop_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [customerId, shopId, limit]
    );

    return result.rows;
  } catch (error) {
    serviceLogger.error('Failed to get loyalty history', error);
    throw error;
  }
}

export default {
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyBalance,
  generateReferralCode,
  validateReferralCode,
  applyReferralReward,
  getReferralStats,
  getLoyaltyHistory,
};
