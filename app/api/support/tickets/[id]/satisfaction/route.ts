import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

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
    const { score, comment } = await request.json();

    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify ticket belongs to user
    const ticketResult = await query(
      'SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2',
      [id, auth.userId]
    );

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const result = await query(
      `UPDATE support_tickets 
       SET customer_satisfaction_score = $1, satisfaction_comment = $2, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [score, comment || null, new Date(), id]
    );

    // Update support staff stats if assigned
    if (result.rows[0].assigned_to) {
      const staffStats = await query(
        `SELECT customer_satisfaction_rating, total_resolved_tickets 
         FROM support_staff WHERE id = $1`,
        [result.rows[0].assigned_to]
      );

      const currentStats = staffStats.rows[0];
      const newAvg =
        (currentStats.customer_satisfaction_rating * currentStats.total_resolved_tickets + score) /
        (currentStats.total_resolved_tickets + 1);

      await query(
        `UPDATE support_staff 
         SET customer_satisfaction_rating = $1, updated_at = $2
         WHERE id = $3`,
        [newAvg, new Date(), result.rows[0].assigned_to]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting satisfaction rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}
