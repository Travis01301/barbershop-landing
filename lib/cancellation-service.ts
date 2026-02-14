import { logger } from './logger'
import { query } from './db'

const cancellationLogger = logger.createChild('cancellation-service')

export interface CancellationConfig {
  minFee: number // e.g., 15
  maxFee: number // e.g., 25
  cancellationWindowHours: number // e.g., 24
}

export interface CancellationResult {
  success: boolean
  appointmentId: string
  fee: number
  hoursBefore: number
  message: string
  error?: string
}

export interface CancellationValidation {
  isValid: boolean
  reason?: string
  hoursBefore?: number
  wouldIncurFee?: boolean
  feeAmount?: number
}

const DEFAULT_CONFIG: CancellationConfig = {
  minFee: 15,
  maxFee: 25,
  cancellationWindowHours: 24,
}

/**
 * Cancellation Service
 * Handles appointment cancellations with fee enforcement
 */
class CancellationService {
  private config: CancellationConfig

  constructor(config: Partial<CancellationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Validate if an appointment can be cancelled and calculate fee
   */
  async validateCancellation(
    appointmentId: string,
    shopId: number
  ): Promise<CancellationValidation> {
    try {
      // Fetch appointment
      const aptResult = await query(
        `SELECT 
          id, status, start_time, created_at, shop_id
         FROM appointments 
         WHERE id = $1 AND shop_id = $2`,
        [appointmentId, shopId]
      )

      if (aptResult.rows.length === 0) {
        return {
          isValid: false,
          reason: 'Appointment not found',
        }
      }

      const apt = aptResult.rows[0]

      // Check if already cancelled
      if (apt.status === 'cancelled') {
        return {
          isValid: false,
          reason: 'Appointment already cancelled',
        }
      }

      // Check if appointment is in the past
      const appointmentTime = new Date(apt.start_time)
      const now = new Date()

      if (appointmentTime < now) {
        return {
          isValid: false,
          reason: 'Cannot cancel past appointments',
        }
      }

      // Calculate hours until appointment
      const hoursBefore = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)

      // Check if within cancellation window and calculate fee
      const wouldIncurFee = hoursBefore < this.config.cancellationWindowHours
      const feeAmount = wouldIncurFee ? this.calculateFee(hoursBefore) : 0

      return {
        isValid: true,
        hoursBefore: Math.round(hoursBefore * 10) / 10, // Round to 1 decimal
        wouldIncurFee,
        feeAmount,
      }
    } catch (error) {
      cancellationLogger.error('Error validating cancellation', error, { appointmentId })
      return {
        isValid: false,
        reason: 'Error validating cancellation',
      }
    }
  }

  /**
   * Calculate cancellation fee based on hours until appointment
   * Linear scale from minFee to maxFee based on how close to appointment
   */
  calculateFee(hoursBefore: number): number {
    if (hoursBefore >= this.config.cancellationWindowHours) {
      return 0 // No fee if 24+ hours before
    }

    if (hoursBefore <= 0) {
      return this.config.maxFee // Maximum fee for last-minute cancellations
    }

    // Linear interpolation: at 24h = $0, at 0h = $25
    // Formula: maxFee * (1 - hoursBefore / 24)
    const feePercentage = 1 - hoursBefore / this.config.cancellationWindowHours
    const fee = this.config.maxFee * feePercentage

    // Round to nearest dollar between minFee and maxFee
    const roundedFee = Math.round(fee)
    return Math.max(this.config.minFee, Math.min(roundedFee, this.config.maxFee))
  }

  /**
   * Process appointment cancellation
   */
  async cancelAppointment(
    appointmentId: string,
    shopId: number,
    reason?: string,
    cancelledBy: string = 'customer'
  ): Promise<CancellationResult> {
    try {
      // Validate cancellation first
      const validation = await this.validateCancellation(appointmentId, shopId)

      if (!validation.isValid) {
        return {
          success: false,
          appointmentId,
          fee: 0,
          hoursBefore: 0,
          message: validation.reason || 'Cancellation not allowed',
          error: validation.reason,
        }
      }

      const fee = validation.feeAmount || 0
      const hoursBefore = validation.hoursBefore || 0

      // Get appointment details for audit
      const aptResult = await query(
        `SELECT customer_email FROM appointments WHERE id = $1`,
        [appointmentId]
      )

      const customerEmail = aptResult.rows[0]?.customer_email || 'unknown'

      // Update appointment status
      await query(
        `UPDATE appointments 
         SET status = 'cancelled', 
             cancelled_at = NOW(),
             cancellation_fee = $1,
             cancelled_reason = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [fee, reason || null, appointmentId]
      )

      // Log to audit table
      await query(
        `INSERT INTO appointment_cancellations 
         (appointment_id, shop_id, customer_email, cancellation_fee, reason, cancelled_by, cancellation_hours_before)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [appointmentId, shopId, customerEmail, fee, reason || null, cancelledBy, hoursBefore]
      )

      cancellationLogger.info('Appointment cancelled successfully', {
        appointmentId,
        shopId,
        fee,
        hoursBefore,
        cancelledBy,
      })

      const message =
        fee > 0
          ? `Appointment cancelled. A cancellation fee of $${fee.toFixed(2)} will be applied.`
          : 'Appointment cancelled successfully. No cancellation fee.'

      return {
        success: true,
        appointmentId,
        fee,
        hoursBefore,
        message,
      }
    } catch (error) {
      cancellationLogger.error('Error cancelling appointment', error, { appointmentId })
      return {
        success: false,
        appointmentId,
        fee: 0,
        hoursBefore: 0,
        message: 'Error cancelling appointment',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Get cancellation fee for an appointment without cancelling it
   */
  async getCancellationFee(appointmentId: string, shopId: number): Promise<number> {
    const validation = await this.validateCancellation(appointmentId, shopId)
    return validation.feeAmount || 0
  }

  /**
   * Get cancellation audit for a shop
   */
  async getCancellationAudit(
    shopId: number,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          id, appointment_id, customer_email, cancellation_fee, reason, 
          cancelled_by, cancellation_hours_before, is_refundable, cancelled_at
         FROM appointment_cancellations
         WHERE shop_id = $1
         ORDER BY cancelled_at DESC
         LIMIT $2 OFFSET $3`,
        [shopId, limit, offset]
      )

      return result.rows
    } catch (error) {
      cancellationLogger.error('Error fetching cancellation audit', error, { shopId })
      return []
    }
  }

  /**
   * Get cancellation statistics for a shop
   */
  async getCancellationStats(shopId: number): Promise<{
    totalCancellations: number
    totalFeesCollected: number
    averageFee: number
    cancellationRate: number
  }> {
    try {
      const statsResult = await query(
        `SELECT 
          COUNT(*) as total_cancellations,
          COALESCE(SUM(cancellation_fee), 0) as total_fees,
          COALESCE(AVG(cancellation_fee), 0) as avg_fee
         FROM appointment_cancellations
         WHERE shop_id = $1`,
        [shopId]
      )

      const stats = statsResult.rows[0]

      // Calculate cancellation rate
      const rateResult = await query(
        `SELECT 
          COUNT(*) FILTER(WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) as total_count
         FROM appointments
         WHERE shop_id = $1`,
        [shopId]
      )

      const rate = rateResult.rows[0]
      const cancellationRate =
        rate.total_count > 0 ? (rate.cancelled_count / rate.total_count) * 100 : 0

      return {
        totalCancellations: parseInt(stats.total_cancellations),
        totalFeesCollected: parseFloat(stats.total_fees),
        averageFee: parseFloat(stats.avg_fee),
        cancellationRate: Math.round(cancellationRate * 10) / 10,
      }
    } catch (error) {
      cancellationLogger.error('Error fetching cancellation stats', error, { shopId })
      return {
        totalCancellations: 0,
        totalFeesCollected: 0,
        averageFee: 0,
        cancellationRate: 0,
      }
    }
  }
}

// Export singleton with default config
export const cancellationService = new CancellationService(DEFAULT_CONFIG)

// Export class for testing with custom config
export default CancellationService
