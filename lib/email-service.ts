import { logger } from './logger'

const emailLogger = logger.createChild('email-service')

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export interface BookingConfirmationData {
  customerName: string
  customerEmail: string
  barberName: string
  appointmentDate: string
  appointmentTime: string
  serviceName: string
  shopName: string
}

export interface ReminderEmailData {
  customerName: string
  customerEmail: string
  barberName: string
  appointmentDate: string
  appointmentTime: string
  shopName: string
  shopPhone?: string
}

export interface CancellationEmailData {
  customerName: string
  customerEmail: string
  barberName: string
  appointmentDate: string
  appointmentTime: string
  cancellationReason?: string
  shopName: string
}

/**
 * Email service using Resend
 */
class EmailService {
  private apiKey: string
  private fromEmail: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@barbershop.local'

    if (!this.apiKey) {
      emailLogger.warn('RESEND_API_KEY not configured, emails will be logged only')
    }
  }

  /**
   * Send email via Resend
   */
  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    if (!this.apiKey) {
      emailLogger.debug('Email service not configured, logging instead', {
        to: payload.to,
        subject: payload.subject,
      })
      return { success: true }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        emailLogger.error('Resend API error', error)
        return { success: false }
      }

      const data = (await response.json()) as any
      emailLogger.info('Email sent successfully', {
        to: payload.to,
        subject: payload.subject,
        messageId: data.id,
      })

      return { success: true, messageId: data.id }
    } catch (error) {
      emailLogger.error('Error sending email', error, { to: payload.to })
      return { success: false }
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    const html = this.buildBookingConfirmationHtml(data)
    const text = this.buildBookingConfirmationText(data)

    const result = await this.send({
      to: data.customerEmail,
      subject: `Booking Confirmed - ${data.shopName}`,
      html,
      text,
    })

    return result.success
  }

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(data: ReminderEmailData): Promise<boolean> {
    const html = this.buildReminderHtml(data)
    const text = this.buildReminderText(data)

    const result = await this.send({
      to: data.customerEmail,
      subject: `Reminder: Your appointment tomorrow at ${data.shopName}`,
      html,
      text,
    })

    return result.success
  }

  /**
   * Send cancellation confirmation email
   */
  async sendCancellationConfirmation(data: CancellationEmailData): Promise<boolean> {
    const html = this.buildCancellationHtml(data)
    const text = this.buildCancellationText(data)

    const result = await this.send({
      to: data.customerEmail,
      subject: `Appointment Cancelled - ${data.shopName}`,
      html,
      text,
    })

    return result.success
  }

  /**
   * Build booking confirmation HTML
   */
  private buildBookingConfirmationHtml(data: BookingConfirmationData): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmed! ✅</h2>
        <p>Hi ${this.escapeHtml(data.customerName)},</p>
        <p>Your appointment has been confirmed. Here are the details:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Shop:</strong> ${this.escapeHtml(data.shopName)}</p>
          <p style="margin: 10px 0;"><strong>Barber:</strong> ${this.escapeHtml(data.barberName)}</p>
          <p style="margin: 10px 0;"><strong>Service:</strong> ${this.escapeHtml(data.serviceName)}</p>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${this.escapeHtml(data.appointmentDate)}</p>
          <p style="margin: 10px 0;"><strong>Time:</strong> ${this.escapeHtml(data.appointmentTime)}</p>
        </div>
        
        <p>Please arrive 5-10 minutes early. If you need to reschedule or cancel, please contact the shop directly.</p>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>${this.escapeHtml(data.shopName)} Team</p>
      </div>
    `
  }

  /**
   * Build booking confirmation text
   */
  private buildBookingConfirmationText(data: BookingConfirmationData): string {
    return `
Booking Confirmed! ✅

Hi ${data.customerName},

Your appointment has been confirmed. Here are the details:

Shop: ${data.shopName}
Barber: ${data.barberName}
Service: ${data.serviceName}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}

Please arrive 5-10 minutes early. If you need to reschedule or cancel, please contact the shop directly.

We look forward to seeing you!

Best regards,
${data.shopName} Team
    `.trim()
  }

  /**
   * Build reminder email HTML
   */
  private buildReminderHtml(data: ReminderEmailData): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Appointment Reminder 📅</h2>
        <p>Hi ${this.escapeHtml(data.customerName)},</p>
        <p>This is a friendly reminder about your upcoming appointment.</p>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <p style="margin: 10px 0;"><strong>Tomorrow at ${this.escapeHtml(data.appointmentTime)}</strong></p>
          <p style="margin: 10px 0;"><strong>With:</strong> ${this.escapeHtml(data.barberName)}</p>
          <p style="margin: 10px 0;"><strong>At:</strong> ${this.escapeHtml(data.shopName)}</p>
          ${data.shopPhone ? `<p style="margin: 10px 0;"><strong>Phone:</strong> ${this.escapeHtml(data.shopPhone)}</p>` : ''}
        </div>
        
        <p>Please arrive a few minutes early. If you need to cancel or reschedule, contact us as soon as possible.</p>
        <p>See you tomorrow!</p>
        <p>${this.escapeHtml(data.shopName)} Team</p>
      </div>
    `
  }

  /**
   * Build reminder email text
   */
  private buildReminderText(data: ReminderEmailData): string {
    return `
Appointment Reminder 📅

Hi ${data.customerName},

This is a friendly reminder about your upcoming appointment.

Tomorrow at ${data.appointmentTime}
With: ${data.barberName}
At: ${data.shopName}
${data.shopPhone ? `Phone: ${data.shopPhone}` : ''}

Please arrive a few minutes early. If you need to cancel or reschedule, contact us as soon as possible.

See you tomorrow!

${data.shopName} Team
    `.trim()
  }

  /**
   * Build cancellation email HTML
   */
  private buildCancellationHtml(data: CancellationEmailData): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Appointment Cancelled ❌</h2>
        <p>Hi ${this.escapeHtml(data.customerName)},</p>
        <p>Your appointment has been cancelled.</p>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Original Appointment:</strong></p>
          <p style="margin: 10px 0;">${this.escapeHtml(data.appointmentDate)} at ${this.escapeHtml(data.appointmentTime)}</p>
          <p style="margin: 10px 0;"><strong>With:</strong> ${this.escapeHtml(data.barberName)}</p>
          ${data.cancellationReason ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${this.escapeHtml(data.cancellationReason)}</p>` : ''}
        </div>
        
        <p>If you'd like to rebook or have questions, please contact ${this.escapeHtml(data.shopName)} directly.</p>
        <p>${this.escapeHtml(data.shopName)} Team</p>
      </div>
    `
  }

  /**
   * Build cancellation email text
   */
  private buildCancellationText(data: CancellationEmailData): string {
    return `
Appointment Cancelled ❌

Hi ${data.customerName},

Your appointment has been cancelled.

Original Appointment:
${data.appointmentDate} at ${data.appointmentTime}
With: ${data.barberName}
${data.cancellationReason ? `Reason: ${data.cancellationReason}` : ''}

If you'd like to rebook or have questions, please contact ${data.shopName} directly.

${data.shopName} Team
    `.trim()
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, char => map[char])
  }
}

export const emailService = new EmailService()

export default emailService
