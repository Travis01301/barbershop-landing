import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/backups
 * List all backups for a shop
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // Filter by backup type
    const status = searchParams.get('status'); // Filter by status

    let query = `
      SELECT 
        id, shop_id, backup_date, backup_type, status, 
        size_bytes, duration_seconds, s3_path, integrity_check_passed,
        created_at, updated_at
      FROM backup_jobs
      WHERE shop_id = $1
    `;
    
    const params: any[] = [admin.shop_id];
    let paramIndex = 2;

    if (type) {
      query += ` AND backup_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY backup_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM backup_jobs WHERE shop_id = $1';
    const countParams: any[] = [admin.shop_id];

    if (type) {
      countQuery += ` AND backup_type = $2`;
      if (status) {
        countQuery += ` AND status = $3`;
      }
    } else if (status) {
      countQuery += ` AND status = $2`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/backups error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/backups/manual
 * Trigger a manual backup
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backup_type = 'full' } = body;

    // Create backup job record
    const result = await pool.query(
      `INSERT INTO backup_jobs (shop_id, backup_type, status, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [admin.shop_id, backup_type, 'pending', admin.id]
    );

    const backup = result.rows[0];

    // Trigger backup script via webhook or cron
    // For now, return the backup job
    return NextResponse.json({
      success: true,
      data: backup,
      message: 'Backup initiated. Check status with the returned backup ID.',
    });
  } catch (error: any) {
    console.error('POST /api/admin/backups error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
