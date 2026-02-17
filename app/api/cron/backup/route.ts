import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';

const execAsync = promisify(exec);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/cron/backup
 * Scheduled daily backup job (2 AM UTC)
 * 
 * Triggered by Vercel Cron
 * Protected by Vercel's cron secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Vercel cron secret
    const cronSecret = request.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all shops
    const shopsResult = await pool.query('SELECT id FROM shops WHERE active = true;');
    const shops = shopsResult.rows;

    if (shops.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active shops to backup',
      });
    }

    const results: any[] = [];

    // Trigger backup for each shop
    for (const shop of shops) {
      try {
        // Execute backup script
        const env = {
          ...process.env,
          SHOP_ID: shop.id,
        };

        await execAsync('ts-node scripts/backup.ts', { env });

        results.push({
          shop_id: shop.id,
          status: 'success',
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        results.push({
          shop_id: shop.id,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update statistics
    for (const shop of shops) {
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_attempted,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
          AVG(duration_seconds) as avg_duration,
          COALESCE(SUM(size_bytes), 0) as total_size
         FROM backup_jobs
         WHERE shop_id = $1 AND backup_date > NOW() - INTERVAL '1 day';`,
        [shop.id]
      );

      const stats = statsResult.rows[0];
      const successRate = stats.total_attempted > 0
        ? (stats.total_successful / stats.total_attempted) * 100
        : 0;

      await pool.query(
        `INSERT INTO backup_statistics (
          shop_id, stat_date, total_backups_attempted, total_backups_successful,
          total_backups_failed, average_backup_duration_seconds,
          total_backup_size_bytes, success_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (shop_id, stat_date) DO UPDATE SET
          total_backups_attempted = $3,
          total_backups_successful = $4,
          total_backups_failed = $5,
          average_backup_duration_seconds = $6,
          total_backup_size_bytes = $7,
          success_rate = $8;`,
        [
          shop.id,
          new Date().toISOString().split('T')[0],
          stats.total_attempted,
          stats.total_successful,
          stats.total_failed,
          Math.floor(stats.avg_duration || 0),
          stats.total_size,
          successRate,
        ]
      );
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `Backup completed for ${shops.length} shop(s)`,
      results,
    });
  } catch (error: any) {
    console.error('Backup cron error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
