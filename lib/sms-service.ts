import { logger } from './logger'
import { query } from './db'

const smsLogger = logger.createChild('sms-service')

export interface SMSPayload {
  phoneNumber: string
  message: string
}

export interface BookingSMSData {
  customerName: string
  customerPhone: string
  barberName: string
  appointmentDate: string
  appointmentTime: string
  serviceName?: string
  shopName: string
  cancelLink?: string
}

export interface ReminderSMSData {
  customerName: string
  customerPhone: string
  barberName: string
  appointmentTime: string
  shopName: string
  shopPhone?: string
}

export interface CancellationSMSData {
  customerName: string
  customerPhone: string
  barberName: string
  appointmentTime: string
  cancellationFee?: number
  shopName: string
}

/**
 * SMS Service using Twilio API
 */
class SMSService {
  private accountSid: string
  private authToken: string
  private phoneNumber: string
  private apiUrl: string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN || ''
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || ''
    this.apiUrl = 'https://api.twilio.com/2010-04-01'

    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      smsLogger.warn(
        'Twilio credentials not configured. SMS will be logged only.',
        {
          hasAccountSid: !!this.accountSid,
          hasAuthToken: !!this.authToken,
          hasPhoneNumber: !!this.phoneNumber,
        }
      )
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async send(payload: SMSPayload): Promise<{ success: boolean; messageId?: string }> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(payload.phoneNumber)) {
      smsLogger.warn('Invalid phone number format', {
        phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
      })
      return { success: false }
    }

    if (!this.accountSid || !this.authToken) {
      smsLogger.debug('SMS service not configured, logging instead', {
        phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
        messageLength: payload.message.length,
      })
      return { success: true }
    }

    try {
      const response = await fetch(`${this.apiUrl}/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'),
        },
        body: new URLSearchParams({
          From: this.phoneNumber,
          To: payload.phoneNumber,
          Body: payload.message,
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.json()
        smsLogger.error('Twilio API error', error)
        return { success: false }
      }

      const data = (await response.json()) as any
      smsLogger.info('SMS sent successfully', {
        phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
        messageId: data.sid,
        messageLength: payload.message.length,
      })

      return { success: true, messageId: data.sid }
    } catch (error) {
      smsLogger.error('Error sending SMS', error, {
        phoneNumber: this.maskPhoneNumber(payload.phoneNumber),
      })
      return { success: false }
    }
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmation(data: BookingSMSData): Promise<boolean> {
    const message = this.buildBookingSMS(data)
    const result = await this.send({
      phoneNumber: data.customerPhone,
      message,
    })
    return result.success
  }

  /**
   * Send 24-hour appointment reminder SMS
   */
  async send24hReminder(data: ReminderSMSData): Promise<boolean> {
    const message = this.buildReminderSMS(data)
    const result = await this.send({
      phoneNumber: data.customerPhone,
      message,
    })
    return result.success
  }

  /**
   * Send day-of appointment reminder SMS
   */
  async sendDayOfReminder(data: ReminderSMSData): Promise<boolean> {
    const message = this.buildDayOfReminderSMS(data)
    const result = await this.send({
      phoneNumber: data.customerPhone,
      message,
    })
    return result.success
  }

  /**
   * Send cancellation notice SMS
   */
  async sendCancellationNotice(data: CancellationSMSData): Promise<boolean> {
    const message = this.buildCancellationSMS(data)
    const result = await this.send({
      phoneNumber: data.customerPhone,
      message,
    })
    return result.success
  }

  /**
   * Build booking confirmation SMS (short, no HTML)
   */
  private buildBookingSMS(data: BookingSMSData): string {
    const service = data.serviceName ? ` - ${data.serviceName}` : ''
    return (
      `Hi ${data.customerName}! Your appointment is confirmed at ${data.shopName}. ` +
      `${data.appointmentDate} at ${data.appointmentTime} with ${data.barberName}${service}. ` +
      `Please arrive 5-10 minutes early.`
    )
  }

  /**
   * Build 24-hour reminder SMS
   */
  private buildReminderSMS(data: ReminderSMSData): string {
    return (
      `Hi ${data.customerName}! Reminder: Your appointment at ${data.shopName} ` +
      `is tomorrow at ${data.appointmentTime} with ${data.barberName}. ` +
      `${data.shopPhone ? `Call ${data.shopPhone} ` : ''}if you need to reschedule.`
    )
  }

  /**
   * Build day-of reminder SMS
   */
  private buildDayOfReminderSMS(data: ReminderSMSData): string {
    return (
      `Hi ${data.customerName}! Your appointment at ${data.shopName} ` +
      `is today at ${data.appointmentTime} with ${data.barberName}. See you soon!`
    )
  }

  /**
   * Build cancellation SMS
   */
  private buildCancellationSMS(data: CancellationSMSData): string {
    const feeMessage = data.cancellationFee
      ? ` A cancellation fee of $${data.cancellationFee.toFixed(2)} has been applied.`
      : ''
    return (
      `Hi ${data.customerName}! Your appointment at ${data.shopName} ` +
      `on ${data.appointmentTime} with ${data.barberName} has been cancelled.${feeMessage}`
    )
  }

  /**
   * Validate phone number (basic validation)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove common formatting characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '')
    // Check if it's 10-15 digits (international format typically)
    return /^\+?[1-9]\d{9,14}$/.test(cleaned)
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '')
    if (cleaned.length < 4) return '*****'
    return cleaned.slice(0, -4).replace(/./g, '*') + cleaned.slice(-4)
  }

  /**
   * Log SMS that was sent (for audit trail)
   */
  async logSMSSent(
    appointmentId: string,
    customerPhone: string,
    messageType: 'booking' | 'reminder_24h' | 'reminder_day' | 'cancellation',
    success: boolean,
    messageId?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO sms_logs 
         (appointment_id, customer_phone, message_type, success, twilio_message_id, sent_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [appointmentId, customerPhone, messageType, success, messageId || null]
      )
    } catch (error) {
      smsLogger.error('Error logging SMS', error, { appointmentId })
    }
  }

  /**
   * Get SMS history for an appointment
   */
  async getSMSHistory(appointmentId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM sms_logs 
         WHERE appointment_id = $1 
         ORDER BY sent_at DESC`,
        [appointmentId]
      )
      return result.rows
    } catch (error) {
      smsLogger.error('Error fetching SMS history', error, { appointmentId })
      return []
    }
  }

  /**
   * Get SMS statistics for a shop
   */
  async getSMSStats(shopId: number): Promise<{
    totalSent: number
    successCount: number
    failureCount: number
    successRate: number
  }> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_sent,
          COUNT(*) FILTER(WHERE success = true) as success_count,
          COUNT(*) FILTER(WHERE success = false) as failure_count
         FROM sms_logs sl
         JOIN appointments a ON sl.appointment_id = a.id
         WHERE a.shop_id = $1`,
        [shopId]
      )

      const stats = result.rows[0]
      const total = parseInt(stats.total_sent) || 0
      const successCount = parseInt(stats.success_count) || 0

      return {
        totalSent: total,
        successCount: successCount,
        failureCount: parseInt(stats.failure_count) || 0,
        successRate: total > 0 ? (successCount / total) * 100 : 0,
      }
    } catch (error) {
      smsLogger.error('Error fetching SMS stats', error, { shopId })
      return {
        totalSent: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
      }
    }
  }
}

// Export singleton instance
export const smsService = new SMSService()

export default SMSService
