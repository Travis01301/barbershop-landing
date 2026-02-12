import { Pool } from 'pg'

let resend: any = null

// Lazy load Resend only if API key is available
function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend')
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const pool = new Pool({
  user: 'barbershop_user',
  host: 'localhost',
  database: 'barbershop_booking',
  password: 'your_secure_password_here',
  port: 5432,
})

interface EmailOptions {
  shopId: number
  to: string
  subject: string
  htmlContent: string
  emailType: 'signup' | 'booking_confirmation' | 'appointment_reminder' | 'cancellation'
  relatedId?: number
}

/**
 * Send email using Resend and log it in database
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const resendClient = getResendClient()

    // Skip sending if we don't have RESEND_API_KEY
    if (!resendClient) {
      console.warn('⚠️ RESEND_API_KEY not set. Email not sent (development mode)')
      // Still log it
      await logEmail(options, 'failed', 'RESEND_API_KEY not configured')
      return { success: false, reason: 'No API key' }
    }

    const response = await resendClient.emails.send({
      from: 'Barbershop <noreply@barbershop.app>',
      to: options.to,
      subject: options.subject,
      html: options.htmlContent,
    })

    if (response.error) {
      console.error('❌ Resend error:', response.error)
      await logEmail(options, 'failed', response.error.message)
      return { success: false, error: response.error.message }
    }

    console.log(`✅ Email sent to ${options.to} (type: ${options.emailType})`)
    await logEmail(options, 'sent')
    return { success: true, id: response.data?.id }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Email sending failed:', errorMsg)
    await logEmail(options, 'failed', errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Log email to database for tracking
 */
async function logEmail(
  options: EmailOptions,
  status: 'sent' | 'failed' | 'bounced',
  errorMessage?: string
) {
  try {
    await pool.query(
      `INSERT INTO email_logs (shop_id, recipient_email, subject, email_type, related_id, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [options.shopId, options.to, options.subject, options.emailType, options.relatedId || null, status, errorMessage || null]
    )
  } catch (error) {
    console.error('Failed to log email:', error)
  }
}

/**
 * Get email sending statistics for dashboard
 */
export async function getEmailStats(shopId: number) {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email_type = 'signup' THEN 1 END) as signups,
        COUNT(CASE WHEN email_type = 'booking_confirmation' THEN 1 END) as bookings,
        COUNT(CASE WHEN email_type = 'appointment_reminder' THEN 1 END) as reminders,
        COUNT(CASE WHEN email_type = 'cancellation' THEN 1 END) as cancellations,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM email_logs
      WHERE shop_id = $1`,
      [shopId]
    )
    return result.rows[0]
  } catch (error) {
    console.error('Failed to get email stats:', error)
    return null
  }
}
