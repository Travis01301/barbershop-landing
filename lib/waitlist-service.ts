import { query, getClient } from './db';
import { logger } from './logger';
import { smsService } from './sms-service';
import { sendEmail } from './email-service';

const serviceLogger = logger.createChild('waitlist-service');

/**
 * Waitlist Management Service
 * Handles waitlist operations, priority management, and auto-promotion
 */

export interface WaitlistEntry {
  id: number;
  shop_id: number;
  customer_id: number;
  barber_id: number;
  preferred_date: string;
  preferred_time: string | null;
  priority_rank: number;
  priority_level: 'standard' | 'priority';
  priority_fee_charged: number | null;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  promotion_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitlistHistory {
  id: number;
  waitlist_id: number;
  action: string;
  action_date: string;
  reason: string | null;
  promoted_to_appointment_id: number | null;
}

/**
 * Add customer to waitlist
 */
export async function joinWaitlist(
  data: {
    customerId: number;
    barberId: number;
    shopId: number;
    preferredDate: string;
    preferredTime?: string;
    priorityLevel?: 'standard' | 'priority';
    notes?: string;
  }
): Promise<WaitlistEntry | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get current position in waitlist
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM waitlist
       WHERE barber_id = $1 AND preferred_date = $2
       AND status = 'waiting'`,
      [data.barberId, data.preferredDate]
    );

    const priorityRank = parseInt(countResult.rows[0].count) + 1;

    // Insert waitlist entry
    const result = await client.query(
      `INSERT INTO waitlist (
        shop_id, customer_id, barber_id, preferred_date, preferred_time,
        priority_rank, priority_level, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting', $8)
      RETURNING *`,
      [
        data.shopId,
        data.customerId,
        data.barberId,
        data.preferredDate,
        data.preferredTime || null,
        priorityRank,
        data.priorityLevel || 'standard',
        data.notes || null,
      ]
    );

    const entry = result.rows[0];

    // Log action
    await client.query(
      `INSERT INTO waitlist_history (waitlist_id, action, reason)
       VALUES ($1, 'joined', $2)`,
      [entry.id, `Joined as position ${priorityRank}`]
    );

    await client.query('COMMIT');
    serviceLogger.info('Customer added to waitlist', {
      customerId: data.customerId,
      barberId: data.barberId,
    });

    return entry;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to join waitlist', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get waitlist for a barber
 */
export async function getWaitlistForBarber(
  barberId: number,
  shopId: number,
  date?: string
): Promise<WaitlistEntry[]> {
  try {
    let query_text = `SELECT w.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
                      FROM waitlist w
                      JOIN customer_profiles c ON w.customer_id = c.id
                      WHERE w.barber_id = $1 AND w.shop_id = $2
                      AND w.status = 'waiting'`;
    const values = [barberId, shopId];

    if (date) {
      query_text += ` AND w.preferred_date = $3`;
      values.push(date);
    }

    query_text += ` ORDER BY w.priority_level DESC, w.created_at ASC`;

    const result = await query(query_text, values);
    return result.rows;
  } catch (error) {
    serviceLogger.error('Failed to fetch waitlist', error);
    throw error;
  }
}

/**
 * Update waitlist entry priority
 */
export async function updateWaitlistPriority(
  id: number,
  shopId: number,
  priorityLevel: 'standard' | 'priority',
  priorityFeeCharged?: number
): Promise<WaitlistEntry | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE waitlist
       SET priority_level = $1, priority_fee_charged = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND shop_id = $4
       RETURNING *`,
      [priorityLevel, priorityFeeCharged || null, id, shopId]
    );

    if (result.rows[0]) {
      await client.query(
        `INSERT INTO waitlist_history (waitlist_id, action, reason)
         VALUES ($1, 'priority_upgraded', $2)`,
        [id, `Priority changed to ${priorityLevel}${priorityFeeCharged ? ` (fee: $${priorityFeeCharged})` : ''}`]
      );
    }

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to update waitlist priority', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Promote customer from waitlist to appointment
 * Sends notification to customer
 */
export async function promoteFromWaitlist(
  waitlistId: number,
  shopId: number,
  appointmentId: number
): Promise<WaitlistEntry | null> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get waitlist entry
    const waitlistResult = await client.query(
      `SELECT w.*, c.name, c.email, c.phone
       FROM waitlist w
       JOIN customer_profiles c ON w.customer_id = c.id
       WHERE w.id = $1 AND w.shop_id = $2`,
      [waitlistId, shopId]
    );

    if (waitlistResult.rowCount === 0) {
      throw new Error('Waitlist entry not found');
    }

    const entry = waitlistResult.rows[0];

    // Update waitlist status
    const result = await client.query(
      `UPDATE waitlist
       SET status = 'promoted', promotion_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [waitlistId]
    );

    // Log history
    await client.query(
      `INSERT INTO waitlist_history (waitlist_id, action, promoted_to_appointment_id, reason)
       VALUES ($1, 'promoted', $2, $3)`,
      [waitlistId, appointmentId, 'Auto-promoted from waitlist']
    );

    // Send notification
    try {
      if (entry.email) {
        await sendEmail(
          entry.email,
          'Appointment Slot Available!',
          `Your spot for ${entry.preferred_date} with your preferred barber is now available. Please confirm your appointment.`
        );
      }
      if (entry.phone) {
        await smsService.send({
          phoneNumber: entry.phone,
          message: `Great news! Your appointment slot for ${entry.preferred_date} is now available. Please check your email or app to confirm.`
        });
      }
    } catch (notificationError) {
      serviceLogger.warn('Failed to send promotion notification', notificationError);
    }

    await client.query('COMMIT');
    serviceLogger.info('Customer promoted from waitlist', {
      customerId: entry.customer_id,
      waitlistId,
    });

    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to promote from waitlist', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancel waitlist entry
 */
export async function cancelWaitlistEntry(
  id: number,
  shopId: number,
  reason?: string
): Promise<boolean> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE waitlist
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND shop_id = $2`,
      [id, shopId]
    );

    if (result.rowCount > 0) {
      await client.query(
        `INSERT INTO waitlist_history (waitlist_id, action, reason)
         VALUES ($1, 'cancelled', $2)`,
        [id, reason || 'User cancelled']
      );
    }

    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to cancel waitlist entry', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get waitlist position for customer
 */
export async function getWaitlistPosition(
  customerId: number,
  barberId: number,
  date: string
): Promise<number | null> {
  try {
    const result = await query(
      `SELECT priority_rank FROM waitlist
       WHERE customer_id = $1 AND barber_id = $2
       AND preferred_date = $3 AND status = 'waiting'`,
      [customerId, barberId, date]
    );

    return result.rows[0]?.priority_rank || null;
  } catch (error) {
    serviceLogger.error('Failed to get waitlist position', error);
    throw error;
  }
}

/**
 * Get total customers on waitlist for barber on date
 */
export async function getWaitlistSize(
  barberId: number,
  shopId: number,
  date: string
): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM waitlist
       WHERE barber_id = $1 AND shop_id = $2
       AND preferred_date = $3 AND status = 'waiting'`,
      [barberId, shopId, date]
    );

    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    serviceLogger.error('Failed to get waitlist size', error);
    throw error;
  }
}

/**
 * Expire old waitlist entries (older than 30 days and still waiting)
 */
export async function expireOldWaitlistEntries(shopId: number): Promise<number> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE waitlist
       SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE shop_id = $1 AND status = 'waiting'
       AND created_at < NOW() - INTERVAL '30 days'`,
      [shopId]
    );

    const count = result.rowCount || 0;

    // Log history for expired entries
    if (count > 0) {
      await client.query(
        `INSERT INTO waitlist_history (waitlist_id, action, reason)
         SELECT id, 'expired', 'Automatic expiration after 30 days'
         FROM waitlist
         WHERE shop_id = $1 AND status = 'expired'
         AND updated_at = CURRENT_TIMESTAMP`,
        [shopId]
      );
    }

    await client.query('COMMIT');
    serviceLogger.info('Expired old waitlist entries', { count, shopId });
    return count;
  } catch (error) {
    await client.query('ROLLBACK');
    serviceLogger.error('Failed to expire waitlist entries', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  joinWaitlist,
  getWaitlistForBarber,
  updateWaitlistPriority,
  promoteFromWaitlist,
  cancelWaitlistEntry,
  getWaitlistPosition,
  getWaitlistSize,
  expireOldWaitlistEntries,
};
