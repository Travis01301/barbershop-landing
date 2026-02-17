import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/backups/[date]
 * Get backup details for a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = params;

    // Get backup job
    const jobResult = await pool.query(
      `SELECT * FROM backup_jobs 
       WHERE shop_id = $1 AND DATE(backup_date) = $2
       ORDER BY backup_date DESC LIMIT 1;`,
      [admin.shop_id, date]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      );
    }

    const backup = jobResult.rows[0];

    // Get backup metadata
    const metadataResult = await pool.query(
      `SELECT * FROM backup_metadata WHERE backup_job_id = $1;`,
      [backup.id]
    );

    // Get backup logs
    const logsResult = await pool.query(
      `SELECT * FROM backup_logs 
       WHERE backup_job_id = $1 
       ORDER BY timestamp DESC
       LIMIT 100;`,
      [backup.id]
    );

    // Get restore operations
    const restoresResult = await pool.query(
      `SELECT * FROM restore_operations 
       WHERE backup_job_id = $1
       ORDER BY initiated_at DESC;`,
      [backup.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        backup: backup,
        metadata: metadataResult.rows[0] || null,
        logs: logsResult.rows,
        restores: restoresResult.rows,
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/backups/[date] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
