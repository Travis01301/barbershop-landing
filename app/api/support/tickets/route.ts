import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, description, category, priority, shop_id } = await request.json();

    // Validate inputs
    if (!subject || !description || !category || !shop_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validCategories = ['billing', 'technical', 'feature_request', 'account', 'other'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    const ticketId = uuidv4();
    const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await query(
      `INSERT INTO support_tickets 
       (id, ticket_number, shop_id, user_id, subject, description, category, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        ticketId,
        ticketNumber,
        shop_id,
        auth.userId,
        subject,
        description,
        category,
        priority || 'medium',
        'open'
      ]
    );

    // Create SLA metrics
    const slaMinutes = priority === 'urgent' ? 15 : priority === 'high' ? 60 : 240;
    await query(
      `INSERT INTO ticket_sla_metrics 
       (id, ticket_id, first_response_sla_minutes, resolution_sla_minutes)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), ticketId, slaMinutes, slaMinutes * 4]
    );

    // Create system message
    await query(
      `INSERT INTO ticket_messages 
       (id, ticket_id, author_id, author_type, message, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        ticketId,
        auth.userId,
        'customer',
        `Ticket created: ${subject}`,
        false
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `SELECT st.* FROM support_tickets st WHERE st.shop_id = $1`;
    const params: any[] = [shop_id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND st.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      sql += ` AND st.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (category) {
      sql += ` AND st.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY st.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM support_tickets st WHERE st.shop_id = $1`;
    const countParams: any[] = [shop_id];
    let countParamIndex = 2;

    if (status) {
      countSql += ` AND st.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (priority) {
      countSql += ` AND st.priority = $${countParamIndex}`;
      countParams.push(priority);
      countParamIndex++;
    }

    if (category) {
      countSql += ` AND st.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    const countResult = await query(countSql, countParams);

    return NextResponse.json({
      tickets: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
