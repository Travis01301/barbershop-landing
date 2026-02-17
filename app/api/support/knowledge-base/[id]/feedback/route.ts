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
    const { helpful, feedback_text } = await request.json();

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Helpful flag is required' },
        { status: 400 }
      );
    }

    // Verify article exists
    const articleResult = await query(
      'SELECT * FROM knowledge_base_articles WHERE id = $1',
      [id]
    );

    if (articleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Create feedback
    await query(
      `INSERT INTO knowledge_base_article_feedback 
       (id, article_id, user_id, helpful, feedback_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), id, auth.userId, helpful, feedback_text || null]
    );

    // Update article counts
    if (helpful) {
      await query(
        'UPDATE knowledge_base_articles SET helpful_count = helpful_count + 1 WHERE id = $1',
        [id]
      );
    } else {
      await query(
        'UPDATE knowledge_base_articles SET unhelpful_count = unhelpful_count + 1 WHERE id = $1',
        [id]
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
