import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/admin/backups/status
 * Get current backup status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last backup
    const lastBackupResult = await pool.query(
      `SELECT * FROM backup_jobs 
       WHERE shop_id = $1 
       ORDER BY backup_date DESC 
       LIMIT 1;`,
      [admin.shop_id]
    );

    // Get next scheduled backup
    const scheduleResult = await pool.query(
      `SELECT * FROM backup_schedules 
       WHERE shop_id = $1 AND enabled = true 
       LIMIT 1;`,
      [admin.shop_id]
    );

    // Get failed backups in last 7 days
    const failedResult = await pool.query(
      `SELECT COUNT(*) FROM backup_jobs 
       WHERE shop_id = $1 AND status = 'failed' 
       AND backup_date > NOW() - INTERVAL '7 days';`,
      [admin.shop_id]
    );

    // Get statistics
    const statsResult = await pool.query(
      `SELECT * FROM backup_statistics 
       WHERE shop_id = $1 
       ORDER BY stat_date DESC 
       LIMIT 1;`,
      [admin.shop_id]
    );

    // Get backup size trend (last 7 days)
    const trendResult = await pool.query(
      `SELECT DATE(backup_date) as date, SUM(size_bytes) as total_size, COUNT(*) as backup_count
       FROM backup_jobs 
       WHERE shop_id = $1 AND status = 'completed' 
       AND backup_date > NOW() - INTERVAL '7 days'
       GROUP BY DATE(backup_date)
       ORDER BY date DESC;`,
      [admin.shop_id]
    );

    // Calculate RPO and RTO status
    let lastBackupDate = null;
    let hoursSinceBackup = 0;
    let rpoStatus = 'healthy';

    if (lastBackupResult.rows.length > 0) {
      lastBackupDate = lastBackupResult.rows[0].backup_date;
      hoursSinceBackup = Math.floor(
        (Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60)
      );
      rpoStatus = hoursSinceBackup > 24 ? 'warning' : 'healthy';
    }

    return NextResponse.json({
      success: true,
      data: {
        last_backup: lastBackupResult.rows[0] || null,
        hours_since_last_backup: hoursSinceBackup,
        rpo_status: rpoStatus, // RPO: 24 hours
        next_scheduled: scheduleResult.rows[0] || null,
        failed_backups_7d: parseInt(failedResult.rows[0].count),
        statistics: statsResult.rows[0] || null,
        size_trend: trendResult.rows,
        rto_target_hours: 2,
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/backups/status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
