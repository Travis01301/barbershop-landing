import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/backups/logs
 * Get backup logs and alerts
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level'); // Filter by log level
    const backup_id = searchParams.get('backup_id'); // Filter by backup ID

    let query = `
      SELECT bl.*, bj.backup_date, bj.status as backup_status
      FROM backup_logs bl
      JOIN backup_jobs bj ON bl.backup_job_id = bj.id
      WHERE bj.shop_id = $1
    `;

    const params: any[] = [admin.shop_id];
    let paramIndex = 2;

    if (level) {
      query += ` AND bl.log_level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (backup_id) {
      query += ` AND bl.backup_job_id = $${paramIndex}`;
      params.push(backup_id);
      paramIndex++;
    }

    query += ` ORDER BY bl.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const logsResult = await pool.query(query, params);

    // Get alert summary
    const alertResult = await pool.query(
      `SELECT 
        COUNT(*) as total_errors,
        COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as errors_24h,
        COUNT(CASE WHEN log_level = 'warning' THEN 1 END) as warnings
      FROM backup_logs bl
      JOIN backup_jobs bj ON bl.backup_job_id = bj.id
      WHERE bj.shop_id = $1 AND bl.log_level IN ('error', 'warning');`,
      [admin.shop_id]
    );

    // Get failed backups
    const failuresResult = await pool.query(
      `SELECT id, backup_date, status, error_message
       FROM backup_jobs
       WHERE shop_id = $1 AND status = 'failed'
       ORDER BY backup_date DESC
       LIMIT 10;`,
      [admin.shop_id]
    );

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM backup_logs bl
      JOIN backup_jobs bj ON bl.backup_job_id = bj.id
      WHERE bj.shop_id = $1
    `;

    const countParams: any[] = [admin.shop_id];

    if (level) {
      countQuery += ` AND bl.log_level = $2`;
      countParams.push(level);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      success: true,
      data: {
        logs: logsResult.rows,
        alerts: alertResult.rows[0],
        recent_failures: failuresResult.rows,
      },
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/backups/logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
