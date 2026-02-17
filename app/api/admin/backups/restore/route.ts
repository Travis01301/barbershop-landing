import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/admin/backups/restore
 * Initiate a restore from backup
 * Requires admin password confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { backup_date, backup_id, admin_password, test_restore = false } = body;

    // Validate required fields
    if (!backup_date && !backup_id) {
      return NextResponse.json(
        { error: 'Either backup_date or backup_id is required' },
        { status: 400 }
      );
    }

    if (!admin_password) {
      return NextResponse.json(
        { error: 'admin_password is required for security' },
        { status: 400 }
      );
    }

    // Verify admin password
    const adminResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND role = $2;',
      [admin.id, 'admin']
    );

    if (adminResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      admin_password,
      adminResult.rows[0].password_hash
    );

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    // Find backup
    let backupResult;
    if (backup_id) {
      backupResult = await pool.query(
        `SELECT * FROM backup_jobs 
         WHERE id = $1 AND shop_id = $2 AND status = 'completed';`,
        [backup_id, admin.shop_id]
      );
    } else {
      backupResult = await pool.query(
        `SELECT * FROM backup_jobs 
         WHERE shop_id = $1 AND DATE(backup_date) = $2 AND status = 'completed'
         ORDER BY backup_date DESC LIMIT 1;`,
        [admin.shop_id, backup_date]
      );
    }

    if (backupResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Backup not found or not completed' },
        { status: 404 }
      );
    }

    const backup = backupResult.rows[0];

    // Create restore operation record
    const restoreResult = await pool.query(
      `INSERT INTO restore_operations (
        backup_job_id, shop_id, initiated_by, status, test_restore
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;`,
      [backup.id, admin.shop_id, admin.id, 'pending', test_restore]
    );

    const restoreOp = restoreResult.rows[0];

    // Log the action
    await pool.query(
      `INSERT INTO backup_logs (backup_job_id, shop_id, log_level, message, metadata)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        backup.id,
        admin.shop_id,
        'info',
        `Restore initiated by ${admin.id}`,
        JSON.stringify({ test_restore, user_id: admin.id }),
      ]
    );

    // Trigger restore script via webhook or cron
    // For now, return the restore operation
    return NextResponse.json({
      success: true,
      data: restoreOp,
      message: test_restore
        ? 'Restore to staging initiated. Monitoring will verify data integrity.'
        : 'WARNING: Production restore initiated. This will overwrite current data. Monitoring in progress.',
      warning: !test_restore ? 'This is a production restore operation' : undefined,
    });
  } catch (error: any) {
    console.error('POST /api/admin/backups/restore error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
