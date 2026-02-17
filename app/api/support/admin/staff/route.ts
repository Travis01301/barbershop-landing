import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

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

    const result = await query(
      `SELECT ss.*, u.name, u.email FROM support_staff ss
       JOIN users u ON ss.user_id = u.id
       WHERE ss.shop_id = $1
       ORDER BY u.name ASC`,
      [shop_id]
    );

    return NextResponse.json({
      staff: result.rows
    });
  } catch (error) {
    console.error('Error fetching support staff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { user_id, title, bio, avatar_url } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const staffId = uuidv4();

    const result = await query(
      `INSERT INTO support_staff 
       (id, user_id, shop_id, title, bio, avatar_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        staffId,
        user_id,
        shop_id,
        title || null,
        bio || null,
        avatar_url || null,
        true
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating support staff:', error);
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}
