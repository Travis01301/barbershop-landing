import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/admin/backups/test-restore
 * Test restore to staging environment
 * Helps verify backup integrity
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backup_id, backup_date } = body;

    // Find backup
    let backupResult;
    if (backup_id) {
      backupResult = await pool.query(
        `SELECT * FROM backup_jobs 
         WHERE id = $1 AND shop_id = $2 AND status = 'completed';`,
        [backup_id, admin.shop_id]
      );
    } else if (backup_date) {
      backupResult = await pool.query(
        `SELECT * FROM backup_jobs 
         WHERE shop_id = $1 AND DATE(backup_date) = $2 AND status = 'completed'
         ORDER BY backup_date DESC LIMIT 1;`,
        [admin.shop_id, backup_date]
      );
    } else {
      return NextResponse.json(
        { error: 'Either backup_id or backup_date is required' },
        { status: 400 }
      );
    }

    if (backupResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Backup not found or not completed' },
        { status: 404 }
      );
    }

    const backup = backupResult.rows[0];

    // Check if restore test already running
    const existingTestResult = await pool.query(
      `SELECT * FROM restore_operations 
       WHERE backup_job_id = $1 AND test_restore = true AND status IN ('pending', 'in_progress')
       LIMIT 1;`,
      [backup.id]
    );

    if (existingTestResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Test restore already in progress for this backup' },
        { status: 409 }
      );
    }

    // Create test restore operation
    const restoreResult = await pool.query(
      `INSERT INTO restore_operations (
        backup_job_id, shop_id, initiated_by, status, test_restore
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
      [backup.id, admin.shop_id, admin.id, 'pending', true]
    );

    const testRestore = restoreResult.rows[0];

    // Log the action
    await pool.query(
      `INSERT INTO backup_logs (backup_job_id, shop_id, log_level, message, metadata)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        backup.id,
        admin.shop_id,
        'info',
        'Test restore initiated to staging environment',
        JSON.stringify({ 
          initiated_by: admin.id, 
          backup_id: backup.id,
          environment: 'staging'
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      data: testRestore,
      message: 'Test restore to staging initiated. This will verify backup integrity without affecting production data.',
      details: {
        backup_date: backup.backup_date,
        backup_size_mb: (backup.size_bytes / 1024 / 1024).toFixed(2),
        environment: 'staging',
        estimated_duration_minutes: Math.ceil(backup.duration_seconds / 60) + 5,
      },
    });
  } catch (error: any) {
    console.error('POST /api/admin/backups/test-restore error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/backups/test-restore
 * Get status of test restores
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT ro.*, bj.backup_date, bj.size_bytes, bj.backup_type
       FROM restore_operations ro
       JOIN backup_jobs bj ON ro.backup_job_id = bj.id
       WHERE ro.shop_id = $1 AND ro.test_restore = true
       ORDER BY ro.initiated_at DESC
       LIMIT 20;`,
      [admin.shop_id]
    );

    // Get summary stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        COUNT(CASE WHEN verification_passed = true THEN 1 END) as verified_tests,
        AVG(duration_seconds) as avg_duration_seconds
      FROM restore_operations 
      WHERE shop_id = $1 AND test_restore = true
      AND initiated_at > NOW() - INTERVAL '30 days';`,
      [admin.shop_id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      statistics: statsResult.rows[0] || {
        total_tests: 0,
        successful_tests: 0,
        failed_tests: 0,
        verified_tests: 0,
        avg_duration_seconds: null,
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/backups/test-restore error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
