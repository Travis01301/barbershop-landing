import { Pool } from 'pg';
import { logger } from './logger';
import { getPool } from './db';

const queueLogger = logger.createChild('queue-service');

export interface WaitlistEntry {
  id: string;
  shop_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  service_type: string;
  estimated_duration: number;
  position_in_queue: number;
  barber_id?: string;
  status: 'waiting' | 'in-service' | 'completed' | 'no-show' | 'cancelled';
  checked_in_at: Date;
  assigned_at?: Date;
  service_started_at?: Date;
  completed_at?: Date;
  wait_time_minutes?: number;
  sms_notified: boolean;
  sms_notified_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface QueueStatus {
  total_waiting: number;
  avg_wait_time: number;
  estimated_wait_time: number;
  next_available_barber?: string;
  queue_display: WaitlistEntry[];
}

export interface QueueAnalytics {
  id: string;
  shop_id: string;
  date: string;
  total_walk_ins: number;
  total_completed: number;
  total_no_shows: number;
  total_cancelled: number;
  avg_wait_time_minutes: number;
  max_wait_time_minutes: number;
  peak_hour: string;
  peak_hour_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Check in a walk-in customer to the queue
 */
export async function checkInCustomer(
  shopId: string,
  customerName: string,
  customerPhone: string,
  serviceType: string,
  estimatedDuration: number = 30,
  customerId?: string
): Promise<WaitlistEntry> {
  const pool = getPool();

  try {
    // Get current max position in queue
    const maxPositionResult = await pool.query(
      `SELECT COALESCE(MAX(position_in_queue), 0) as max_position
       FROM waitlist_queue
       WHERE shop_id = $1 AND status = 'waiting'`,
      [shopId]
    );

    const position = maxPositionResult.rows[0].max_position + 1;

    const result = await pool.query(
      `INSERT INTO waitlist_queue
       (shop_id, customer_id, customer_name, customer_phone, service_type, estimated_duration, position_in_queue)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [shopId, customerId || null, customerName, customerPhone, serviceType, estimatedDuration, position]
    );

    queueLogger.info('Customer checked in', {
      customerId,
      shopId,
      position,
    });

    return result.rows[0] as WaitlistEntry;
  } catch (error) {
    queueLogger.error('Error checking in customer', error);
    throw new Error('Failed to check in customer');
  }
}

/**
 * Get current queue status for a shop
 */
export async function getQueueStatus(shopId: string): Promise<QueueStatus> {
  const pool = getPool();

  try {
    // Get all waiting customers
    const queueResult = await pool.query(
      `SELECT * FROM waitlist_queue
       WHERE shop_id = $1 AND status = 'waiting'
       ORDER BY position_in_queue ASC`,
      [shopId]
    );

    const waitingCustomers = queueResult.rows as WaitlistEntry[];

    // Calculate average wait time from completed entries today
    const avgWaitResult = await pool.query(
      `SELECT AVG(wait_time_minutes) as avg_wait
       FROM waitlist_queue
       WHERE shop_id = $1 
       AND status = 'completed'
       AND DATE(completed_at) = CURRENT_DATE`,
      [shopId]
    );

    const avgWaitTime = avgWaitResult.rows[0].avg_wait || 0;

    // Calculate estimated wait time for next customer
    let estimatedWaitTime = 0;
    if (waitingCustomers.length > 0) {
      const totalDuration = waitingCustomers.reduce((sum, entry) => sum + (entry.estimated_duration || 30), 0);
      estimatedWaitTime = Math.ceil(totalDuration / 2); // Assume 2 barbers average
    }

    return {
      total_waiting: waitingCustomers.length,
      avg_wait_time: Math.round(avgWaitTime),
      estimated_wait_time: estimatedWaitTime,
      queue_display: waitingCustomers,
    };
  } catch (error) {
    queueLogger.error('Error getting queue status', error);
    throw new Error('Failed to get queue status');
  }
}

/**
 * Assign a waiting customer to a barber
 */
export async function assignCustomerToBarber(
  queueId: string,
  barberId: string
): Promise<WaitlistEntry> {
  const pool = getPool();

  try {
    // Get the queue entry
    const queueResult = await pool.query(
      `SELECT * FROM waitlist_queue WHERE id = $1`,
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      throw new Error('Queue entry not found');
    }

    const queueEntry = queueResult.rows[0] as WaitlistEntry;

    // Update queue entry with barber assignment
    const result = await pool.query(
      `UPDATE waitlist_queue
       SET barber_id = $1, status = 'in-service', assigned_at = CURRENT_TIMESTAMP, service_started_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [barberId, queueId]
    );

    // Update positions for remaining waiting customers
    await pool.query(
      `UPDATE waitlist_queue
       SET position_in_queue = position_in_queue - 1
       WHERE shop_id = $1 AND status = 'waiting' AND position_in_queue > $2`,
      [queueEntry.shop_id, queueEntry.position_in_queue]
    );

    queueLogger.info('Customer assigned to barber', {
      queueId,
      barberId,
    });

    return result.rows[0] as WaitlistEntry;
  } catch (error) {
    queueLogger.error('Error assigning customer to barber', error);
    throw new Error('Failed to assign customer to barber');
  }
}

/**
 * Mark a service as completed
 */
export async function completeService(
  queueId: string
): Promise<WaitlistEntry> {
  const pool = getPool();

  try {
    const queueResult = await pool.query(
      `SELECT * FROM waitlist_queue WHERE id = $1`,
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      throw new Error('Queue entry not found');
    }

    const queueEntry = queueResult.rows[0] as WaitlistEntry;

    // Calculate wait time
    const waitTime = queueEntry.assigned_at
      ? Math.floor((new Date().getTime() - new Date(queueEntry.assigned_at).getTime()) / 60000)
      : null;

    const result = await pool.query(
      `UPDATE waitlist_queue
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP, wait_time_minutes = $1
       WHERE id = $2
       RETURNING *`,
      [waitTime, queueId]
    );

    queueLogger.info('Service completed', {
      queueId,
      waitTime,
    });

    return result.rows[0] as WaitlistEntry;
  } catch (error) {
    queueLogger.error('Error completing service', error);
    throw new Error('Failed to complete service');
  }
}

/**
 * Cancel a queue entry
 */
export async function cancelQueueEntry(
  queueId: string
): Promise<WaitlistEntry> {
  const pool = getPool();

  try {
    const queueResult = await pool.query(
      `SELECT * FROM waitlist_queue WHERE id = $1`,
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      throw new Error('Queue entry not found');
    }

    const queueEntry = queueResult.rows[0] as WaitlistEntry;

    const result = await pool.query(
      `UPDATE waitlist_queue
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING *`,
      [queueId]
    );

    // Update positions for remaining waiting customers
    if (queueEntry.status === 'waiting') {
      await pool.query(
        `UPDATE waitlist_queue
         SET position_in_queue = position_in_queue - 1
         WHERE shop_id = $1 AND status = 'waiting' AND position_in_queue > $2`,
        [queueEntry.shop_id, queueEntry.position_in_queue]
      );
    }

    queueLogger.info('Queue entry cancelled', {
      queueId,
    });

    return result.rows[0] as WaitlistEntry;
  } catch (error) {
    queueLogger.error('Error cancelling queue entry', error);
    throw new Error('Failed to cancel queue entry');
  }
}

/**
 * Get queue analytics for a shop
 */
export async function getQueueAnalytics(
  shopId: string,
  startDate: string,
  endDate: string
): Promise<QueueAnalytics[]> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT * FROM queue_analytics
       WHERE shop_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date DESC`,
      [shopId, startDate, endDate]
    );

    return result.rows as QueueAnalytics[];
  } catch (error) {
    queueLogger.error('Error getting queue analytics', error);
    throw new Error('Failed to get queue analytics');
  }
}

/**
 * Calculate and update daily queue analytics
 */
export async function updateDailyAnalytics(shopId: string, date: string): Promise<QueueAnalytics> {
  const pool = getPool();

  try {
    // Get all queue entries for the day
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(AVG(CASE WHEN status = 'completed' THEN wait_time_minutes END)) as avg_wait,
        MAX(CASE WHEN status = 'completed' THEN wait_time_minutes END) as max_wait
       FROM waitlist_queue
       WHERE shop_id = $1 AND DATE(checked_in_at) = $2`,
      [shopId, date]
    );

    const stats = statsResult.rows[0];

    // Get peak hour
    const peakHourResult = await pool.query(
      `SELECT EXTRACT(HOUR FROM checked_in_at) as hour, COUNT(*) as count
       FROM waitlist_queue
       WHERE shop_id = $1 AND DATE(checked_in_at) = $2
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [shopId, date]
    );

    const peakHour = peakHourResult.rows[0];

    // Insert or update analytics
    const result = await pool.query(
      `INSERT INTO queue_analytics
       (shop_id, date, total_walk_ins, total_completed, total_no_shows, total_cancelled, avg_wait_time_minutes, max_wait_time_minutes, peak_hour, peak_hour_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (shop_id, date) DO UPDATE SET
       total_walk_ins = $3, total_completed = $4, total_no_shows = $5, total_cancelled = $6, 
       avg_wait_time_minutes = $7, max_wait_time_minutes = $8, peak_hour = $9, peak_hour_count = $10
       RETURNING *`,
      [
        shopId,
        date,
        stats.total || 0,
        stats.completed || 0,
        stats.no_shows || 0,
        stats.cancelled || 0,
        stats.avg_wait || 0,
        stats.max_wait || 0,
        peakHour?.hour ? `${peakHour.hour}:00` : null,
        peakHour?.count || 0,
      ]
    );

    queueLogger.info('Daily analytics updated', {
      shopId,
      date,
      total: stats.total,
    });

    return result.rows[0] as QueueAnalytics;
  } catch (error) {
    queueLogger.error('Error updating daily analytics', error);
    throw new Error('Failed to update daily analytics');
  }
}

/**
 * Mark customer as no-show
 */
export async function markAsNoShow(queueId: string): Promise<WaitlistEntry> {
  const pool = getPool();

  try {
    const queueResult = await pool.query(
      `SELECT * FROM waitlist_queue WHERE id = $1`,
      [queueId]
    );

    if (queueResult.rows.length === 0) {
      throw new Error('Queue entry not found');
    }

    const queueEntry = queueResult.rows[0] as WaitlistEntry;

    const result = await pool.query(
      `UPDATE waitlist_queue
       SET status = 'no-show'
       WHERE id = $1
       RETURNING *`,
      [queueId]
    );

    // Update positions for remaining waiting customers
    if (queueEntry.status === 'waiting') {
      await pool.query(
        `UPDATE waitlist_queue
         SET position_in_queue = position_in_queue - 1
         WHERE shop_id = $1 AND status = 'waiting' AND position_in_queue > $2`,
        [queueEntry.shop_id, queueEntry.position_in_queue]
      );
    }

    queueLogger.info('Customer marked as no-show', {
      queueId,
    });

    return result.rows[0] as WaitlistEntry;
  } catch (error) {
    queueLogger.error('Error marking customer as no-show', error);
    throw new Error('Failed to mark customer as no-show');
  }
}
