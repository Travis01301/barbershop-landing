import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get ticket
    const ticketResult = await query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketResult.rows[0];

    // Get messages
    const messagesResult = await query(
      `SELECT m.*, u.name, u.email FROM ticket_messages m
       LEFT JOIN users u ON m.author_id = u.id
       WHERE m.ticket_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    // Get attachments
    const attachmentsResult = await query(
      'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get SLA metrics
    const slaResult = await query(
      'SELECT * FROM ticket_sla_metrics WHERE ticket_id = $1',
      [id]
    );

    return NextResponse.json({
      ticket,
      messages: messagesResult.rows,
      attachments: attachmentsResult.rows,
      sla: slaResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, priority, assigned_to, internal_notes } = await request.json();

    const updates: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      updateParams.push(status);
      paramIndex++;

      if (status === 'resolved') {
        updates.push(`resolved_at = $${paramIndex}`);
        updateParams.push(new Date());
        paramIndex++;
      }

      if (status === 'closed') {
        updates.push(`closed_at = $${paramIndex}`);
        updateParams.push(new Date());
        paramIndex++;
      }
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      updateParams.push(priority);
      paramIndex++;
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      updateParams.push(assigned_to);
      paramIndex++;
    }

    if (internal_notes !== undefined) {
      updates.push(`internal_notes = $${paramIndex}`);
      updateParams.push(internal_notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = $${paramIndex}`);
    updateParams.push(new Date());
    paramIndex++;

    updateParams.push(id);

    const result = await query(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateParams
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
