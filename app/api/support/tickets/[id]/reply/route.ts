import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { message, is_internal = false, attachments = [] } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const ticketResult = await query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketResult.rows[0];

    // Determine author type
    const userResult = await query(
      `SELECT role FROM users WHERE id = $1`,
      [auth.userId]
    );

    const user = userResult.rows[0];
    const authorType = user.role === 'admin' ? 'support_staff' : 'customer';

    // Create message
    const messageId = uuidv4();
    const messageResult = await query(
      `INSERT INTO ticket_messages 
       (id, ticket_id, author_id, author_type, message, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [messageId, id, auth.userId, authorType, message, is_internal]
    );

    // Handle attachments
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        await query(
          `INSERT INTO ticket_attachments 
           (id, ticket_id, message_id, file_name, file_size_bytes, file_type, file_url, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            id,
            messageId,
            attachment.file_name,
            attachment.file_size_bytes,
            attachment.file_type,
            attachment.file_url,
            auth.userId
          ]
        );
      }
    }

    // Update ticket if needed
    if (authorType === 'support_staff' && ticket.status === 'open') {
      await query(
        `UPDATE support_tickets 
         SET status = 'in_progress', first_response_at = $1 
         WHERE id = $2`,
        [new Date(), id]
      );
    }

    // Queue email notification
    if (!is_internal) {
      const customerEmail = (await query(
        'SELECT email FROM users WHERE id = $1',
        [ticket.user_id]
      )).rows[0]?.email;

      if (customerEmail) {
        await query(
          `INSERT INTO email_queue 
           (id, ticket_id, recipient_email, subject, html_body, text_body, email_type, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            id,
            customerEmail,
            `Re: ${ticket.subject}`,
            `<p>${message}</p><p>Ticket: ${ticket.ticket_number}</p>`,
            `${message}\n\nTicket: ${ticket.ticket_number}`,
            'ticket_reply',
            'pending'
          ]
        );
      }
    }

    return NextResponse.json(
      {
        message: messageResult.rows[0],
        attachments: attachments || []
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error replying to ticket:', error);
    return NextResponse.json(
      { error: 'Failed to reply to ticket' },
      { status: 500 }
    );
  }
}
