import { Resend } from 'resend';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailQueueItem {
  id: string;
  ticket_id: string;
  recipient_email: string;
  subject: string;
  html_body: string;
  text_body?: string;
  email_type: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

/**
 * Send email for ticket creation
 */
export async function sendTicketCreatedEmail(
  ticketId: string,
  customerEmail: string,
  ticketNumber: string,
  subject: string,
  description: string
) {
  const htmlBody = `
    <h2>Support Ticket Created</h2>
    <p>Your support ticket has been created and assigned to our team.</p>
    <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Description:</strong></p>
    <p>${description.replace(/\n/g, '<br>')}</p>
    <p>You can track your ticket status by visiting your support dashboard or replying to this email.</p>
    <p>We'll get back to you shortly!</p>
  `;

  const textBody = `
Support Ticket Created

Your support ticket has been created and assigned to our team.

Ticket Number: ${ticketNumber}
Subject: ${subject}
Description: ${description}

You can track your ticket status by visiting your support dashboard or replying to this email.

We'll get back to you shortly!
  `;

  return queueEmail({
    ticket_id: ticketId,
    recipient_email: customerEmail,
    subject: `[${ticketNumber}] ${subject}`,
    html_body: htmlBody,
    text_body: textBody,
    email_type: 'ticket_created'
  });
}

/**
 * Send email for ticket reply
 */
export async function sendTicketReplyEmail(
  ticketId: string,
  customerEmail: string,
  ticketNumber: string,
  replyMessage: string,
  replyAuthor: string
) {
  const htmlBody = `
    <h2>New Reply on Your Ticket</h2>
    <p>Hi there,</p>
    <p>There's a new reply to your support ticket:</p>
    <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
    <p><strong>Reply from:</strong> ${replyAuthor}</p>
    <blockquote style="border-left: 3px solid #3B82F6; padding-left: 12px;">
      ${replyMessage.replace(/\n/g, '<br>')}
    </blockquote>
    <p>Visit your support dashboard to see the full conversation and reply.</p>
  `;

  const textBody = `
New Reply on Your Ticket

Ticket Number: ${ticketNumber}
Reply from: ${replyAuthor}

${replyMessage}

Visit your support dashboard to see the full conversation and reply.
  `;

  return queueEmail({
    ticket_id: ticketId,
    recipient_email: customerEmail,
    subject: `[${ticketNumber}] New Reply to Your Support Ticket`,
    html_body: htmlBody,
    text_body: textBody,
    email_type: 'ticket_reply'
  });
}

/**
 * Send email for ticket status update
 */
export async function sendTicketStatusUpdateEmail(
  ticketId: string,
  customerEmail: string,
  ticketNumber: string,
  newStatus: string,
  description?: string
) {
  const statusMessages: Record<string, string> = {
    in_progress: 'Your ticket is now being worked on by our support team.',
    waiting_customer: 'We need additional information from you to proceed.',
    resolved: 'Your ticket has been resolved. Please rate your experience.',
    closed: 'Your ticket has been closed.'
  };

  const message = statusMessages[newStatus] || 'Your ticket status has been updated.';

  const htmlBody = `
    <h2>Ticket Status Update</h2>
    <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
    <p><strong>New Status:</strong> ${newStatus.replace('_', ' ').toUpperCase()}</p>
    <p>${message}</p>
    ${description ? `<p>${description.replace(/\n/g, '<br>')}</p>` : ''}
    <p>Visit your support dashboard for more details.</p>
  `;

  return queueEmail({
    ticket_id: ticketId,
    recipient_email: customerEmail,
    subject: `[${ticketNumber}] Status Update: ${newStatus.replace('_', ' ')}`,
    html_body: htmlBody,
    email_type: 'ticket_status_update'
  });
}

/**
 * Queue email for async processing
 */
export async function queueEmail(emailData: {
  ticket_id: string;
  recipient_email: string;
  subject: string;
  html_body: string;
  text_body?: string;
  email_type: string;
}) {
  try {
    const emailId = uuidv4();
    const result = await query(
      `INSERT INTO email_queue 
       (id, ticket_id, recipient_email, subject, html_body, text_body, email_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        emailId,
        emailData.ticket_id,
        emailData.recipient_email,
        emailData.subject,
        emailData.html_body,
        emailData.text_body || null,
        emailData.email_type,
        'pending'
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error queuing email:', error);
    throw error;
  }
}

/**
 * Process pending emails from queue (runs periodically)
 */
export async function processPendingEmails() {
  try {
    // Get pending emails
    const result = await query(
      `SELECT * FROM email_queue 
       WHERE status = 'pending' AND retry_count < max_retries
       ORDER BY created_at ASC
       LIMIT 100`,
      []
    );

    const emails: EmailQueueItem[] = result.rows;

    for (const email of emails) {
      try {
        // Send email via Resend
        const response = await resend.emails.send({
          from: 'support@barbershop.com',
          to: email.recipient_email,
          subject: email.subject,
          html: email.html_body,
          text: email.text_body || undefined,
          replyTo: 'support@barbershop.com'
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Mark as sent
        await query(
          `UPDATE email_queue 
           SET status = 'sent', sent_at = $1, updated_at = $2 
           WHERE id = $3`,
          [new Date(), new Date(), email.id]
        );

        console.log(`Email sent: ${email.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const newRetryCount = email.retry_count + 1;

        if (newRetryCount >= email.max_retries) {
          // Mark as failed after max retries
          await query(
            `UPDATE email_queue 
             SET status = 'failed', error_message = $1, retry_count = $2, updated_at = $3 
             WHERE id = $4`,
            [errorMessage, newRetryCount, new Date(), email.id]
          );

          console.error(`Email failed (max retries): ${email.id} - ${errorMessage}`);
        } else {
          // Retry later
          await query(
            `UPDATE email_queue 
             SET retry_count = $1, error_message = $2, updated_at = $3 
             WHERE id = $4`,
            [newRetryCount, errorMessage, new Date(), email.id]
          );

          console.warn(`Email retry scheduled: ${email.id} (attempt ${newRetryCount})`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
}

/**
 * Handle incoming email webhook (for support@barbershop.com)
 * This would need to be integrated with email provider's webhook
 */
export async function handleIncomingEmail(
  fromEmail: string,
  subject: string,
  body: string,
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
) {
  try {
    // Try to find existing ticket by subject or thread ID
    let ticketId: string | null = null;

    // Look for ticket number in subject like "[TICKET-123456-ABC]"
    const ticketMatch = subject.match(/\[TICKET-[A-Z0-9-]+\]/);
    if (ticketMatch) {
      const ticketNumber = ticketMatch[0].slice(1, -1); // Remove brackets
      const ticketResult = await query(
        'SELECT id FROM support_tickets WHERE ticket_number = $1',
        [ticketNumber]
      );

      if (ticketResult.rows.length > 0) {
        ticketId = ticketResult.rows[0].id;
      }
    }

    // If no existing ticket, create a new one
    if (!ticketId) {
      const userResult = await query(
        'SELECT id, shop_id FROM users WHERE email = $1',
        [fromEmail]
      );

      if (userResult.rows.length === 0) {
        console.warn(`Incoming email from unknown user: ${fromEmail}`);
        return;
      }

      const user = userResult.rows[0];
      ticketId = uuidv4();
      const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      await query(
        `INSERT INTO support_tickets 
         (id, ticket_number, shop_id, user_id, subject, description, category, priority, status, email_from)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          ticketId,
          ticketNumber,
          user.shop_id,
          user.id,
          subject,
          body,
          'other',
          'medium',
          'open',
          fromEmail
        ]
      );
    } else {
      // Add reply to existing ticket
      const messageId = uuidv4();
      await query(
        `INSERT INTO ticket_messages 
         (id, ticket_id, author_id, author_type, message, is_internal)
         VALUES ($1, $2, NULL, $3, $4, $5)`,
        [messageId, ticketId, 'customer', body, false]
      );
    }

    // Handle attachments if any
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        // Upload to storage and store reference
        const fileUrl = await uploadAttachment(attachment);
        const attachmentId = uuidv4();

        await query(
          `INSERT INTO ticket_attachments 
           (id, ticket_id, file_name, file_size_bytes, file_type, file_url, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            attachmentId,
            ticketId,
            attachment.filename,
            attachment.content.length,
            attachment.contentType,
            fileUrl,
            null // System upload
          ]
        );
      }
    }

    console.log(`Processed incoming email - Ticket: ${ticketId}`);
  } catch (error) {
    console.error('Error handling incoming email:', error);
  }
}

/**
 * Upload attachment to storage (stub - implement based on your storage solution)
 */
async function uploadAttachment(file: {
  filename: string;
  content: Buffer;
  contentType: string;
}): Promise<string> {
  // TODO: Implement file upload to S3, Azure Blob Storage, etc.
  // For now, return a placeholder URL
  return `https://storage.example.com/${file.filename}`;
}

/**
 * Get email statistics
 */
export async function getEmailStats(shopId: string) {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM email_queue eq
       JOIN support_tickets st ON eq.ticket_id = st.id
       WHERE st.shop_id = $1`,
      [shopId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting email stats:', error);
    return null;
  }
}
