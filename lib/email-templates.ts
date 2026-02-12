/**
 * Email template: Barber signup confirmation
 */
export function SignupConfirmationEmail(props: {
  barberName: string
  shopName: string
  activationLink: string
  expiresIn: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; }
          .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { color: #1f2937; margin-bottom: 20px; }
          .button { background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 class="header">Welcome to Barbershop! 💈</h1>
            
            <p>Hi ${props.barberName},</p>
            
            <p>Thank you for registering <strong>${props.shopName}</strong> on our platform. We're excited to have you on board!</p>
            
            <p>To get started and verify your email, please click the button below:</p>
            
            <a href="${props.activationLink}" class="button">Activate Your Account</a>
            
            <p><strong>Link expires in ${props.expiresIn}</strong></p>
            
            <p>If you didn't create this account, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>© 2026 Barbershop. All rights reserved.</p>
              <p>If you have any questions, contact us at support@barbershop.app</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Email template: Booking confirmation for customer
 */
export function BookingConfirmationEmail(props: {
  customerName: string
  barberName: string
  serviceDate: string
  serviceTime: string
  shopName: string
  bookingId: string
  cancelLink: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; }
          .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { color: #1f2937; margin-bottom: 20px; }
          .details { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .button { background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .cancel-button { background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 class="header">✅ Booking Confirmed!</h1>
            
            <p>Hi ${props.customerName},</p>
            
            <p>Great news! Your appointment has been confirmed at <strong>${props.shopName}</strong>.</p>
            
            <div class="details">
              <div class="detail-row">
                <span>📅 Date:</span>
                <strong>${props.serviceDate}</strong>
              </div>
              <div class="detail-row">
                <span>⏰ Time:</span>
                <strong>${props.serviceTime}</strong>
              </div>
              <div class="detail-row">
                <span>💈 Barber:</span>
                <strong>${props.barberName}</strong>
              </div>
              <div class="detail-row">
                <span>📌 Booking ID:</span>
                <strong>${props.bookingId}</strong>
              </div>
            </div>
            
            <p>Please arrive 5-10 minutes early. We look forward to seeing you!</p>
            
            <p>
              <a href="${props.cancelLink}" class="cancel-button">Cancel Appointment</a>
            </p>
            
            <div class="footer">
              <p>© 2026 Barbershop. All rights reserved.</p>
              <p>If you have any questions, contact the shop directly.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Email template: Appointment reminder (24 hours before)
 */
export function AppointmentReminderEmail(props: {
  customerName: string
  barberName: string
  serviceDate: string
  serviceTime: string
  shopName: string
  rescheduleLink: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; }
          .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { color: #1f2937; margin-bottom: 20px; }
          .highlight { background: #fef3c7; padding: 20px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .button { background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 class="header">⏰ Appointment Reminder</h1>
            
            <p>Hi ${props.customerName},</p>
            
            <div class="highlight">
              <p style="margin: 0;"><strong>Your appointment is tomorrow!</strong></p>
              <p style="margin: 10px 0 0 0;">📅 ${props.serviceDate} at ${props.serviceTime}</p>
              <p style="margin: 5px 0 0 0;">💈 ${props.barberName} at ${props.shopName}</p>
            </div>
            
            <p>We're looking forward to seeing you! Please arrive on time so we can give you the best service.</p>
            
            <p>Need to reschedule or cancel?</p>
            <a href="${props.rescheduleLink}" class="button">Manage Appointment</a>
            
            <div class="footer">
              <p>© 2026 Barbershop. All rights reserved.</p>
              <p>If you have any questions, contact the shop directly.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Email template: Appointment cancellation
 */
export function CancellationEmail(props: {
  customerName: string
  barberName: string
  serviceDate: string
  serviceTime: string
  shopName: string
  rebookLink: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px; }
          .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { color: #1f2937; margin-bottom: 20px; }
          .cancelled { background: #fee2e2; padding: 20px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 20px 0; }
          .button { background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 class="header">Appointment Cancelled</h1>
            
            <p>Hi ${props.customerName},</p>
            
            <div class="cancelled">
              <p style="margin: 0;"><strong>Your appointment has been cancelled</strong></p>
              <p style="margin: 10px 0 0 0;">📅 ${props.serviceDate} at ${props.serviceTime}</p>
              <p style="margin: 5px 0 0 0;">💈 ${props.barberName} at ${props.shopName}</p>
            </div>
            
            <p>We're sorry to see you go. If you'd like to reschedule, please book another appointment:</p>
            <a href="${props.rebookLink}" class="button">Book New Appointment</a>
            
            <p>We hope to see you soon!</p>
            
            <div class="footer">
              <p>© 2026 Barbershop. All rights reserved.</p>
              <p>If you have any questions, contact the shop directly.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
