import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const shop_id = searchParams.get('shop_id');

    // Verify user is admin
    const userResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [auth.userId]
    );

    if (userResult.rows[0]?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get open tickets
    const openTicketsResult = await query(
      `SELECT COUNT(*) as count FROM support_tickets 
       WHERE shop_id = $1 AND status IN ('open', 'in_progress')`,
      [shop_id]
    );

    // Get urgent tickets
    const urgentTicketsResult = await query(
      `SELECT COUNT(*) as count FROM support_tickets 
       WHERE shop_id = $1 AND priority = 'urgent' AND status != 'closed'`,
      [shop_id]
    );

    // Get tickets by priority
    const byPriorityResult = await query(
      `SELECT priority, COUNT(*) as count FROM support_tickets 
       WHERE shop_id = $1 AND status != 'closed'
       GROUP BY priority`,
      [shop_id]
    );

    // Get tickets by status
    const byStatusResult = await query(
      `SELECT status, COUNT(*) as count FROM support_tickets 
       WHERE shop_id = $1
       GROUP BY status`,
      [shop_id]
    );

    // Get tickets by category
    const byCategoryResult = await query(
      `SELECT category, COUNT(*) as count FROM support_tickets 
       WHERE shop_id = $1
       GROUP BY category`,
      [shop_id]
    );

    // Get average response time
    const avgResponseTimeResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_minutes
       FROM support_tickets 
       WHERE shop_id = $1 AND first_response_at IS NOT NULL`,
      [shop_id]
    );

    // Get average resolution time
    const avgResolutionTimeResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes
       FROM support_tickets 
       WHERE shop_id = $1 AND resolved_at IS NOT NULL`,
      [shop_id]
    );

    // Get average satisfaction score
    const avgSatisfactionResult = await query(
      `SELECT AVG(customer_satisfaction_score) as avg_score
       FROM support_tickets 
       WHERE shop_id = $1 AND customer_satisfaction_score IS NOT NULL`,
      [shop_id]
    );

    // Get recent tickets
    const recentTicketsResult = await query(
      `SELECT st.*, u.name, u.email, ss.title as assigned_staff
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.id
       LEFT JOIN support_staff ss ON st.assigned_to = ss.id
       WHERE st.shop_id = $1
       ORDER BY st.created_at DESC
       LIMIT 10`,
      [shop_id]
    );

    // Get SLA breaches
    const slaBreachesResult = await query(
      `SELECT COUNT(*) as count FROM ticket_sla_metrics 
       WHERE ticket_id IN (
         SELECT id FROM support_tickets WHERE shop_id = $1
       ) AND (first_response_breached = true OR resolution_breached = true)`,
      [shop_id]
    );

    return NextResponse.json({
      openTickets: parseInt(openTicketsResult.rows[0].count),
      urgentTickets: parseInt(urgentTicketsResult.rows[0].count),
      byPriority: byPriorityResult.rows,
      byStatus: byStatusResult.rows,
      byCategory: byCategoryResult.rows,
      avgResponseTimeMinutes: parseFloat(avgResponseTimeResult.rows[0].avg_minutes || 0),
      avgResolutionTimeMinutes: parseFloat(avgResolutionTimeResult.rows[0].avg_minutes || 0),
      avgSatisfactionScore: parseFloat(avgSatisfactionResult.rows[0].avg_score || 0),
      recentTickets: recentTicketsResult.rows,
      slaBreaches: parseInt(slaBreachesResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
