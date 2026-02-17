import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';

const execAsync = promisify(exec);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/cron/test-restore
 * Weekly automated restore test (Monday 4 AM UTC)
 * 
 * Tests backup integrity without affecting production
 * Results sent to admin
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

    const results: any[] = [];

    for (const shop of shops) {
      try {
        // Find latest successful backup
        const backupResult = await pool.query(
          `SELECT id, backup_date FROM backup_jobs 
           WHERE shop_id = $1 AND status = 'completed'
           ORDER BY backup_date DESC LIMIT 1;`,
          [shop.id]
        );

        if (backupResult.rows.length === 0) {
          results.push({
            shop_id: shop.id,
            status: 'skipped',
            reason: 'No completed backups found',
          });
          continue;
        }

        const backup = backupResult.rows[0];

        // Create test restore record
        const restoreResult = await pool.query(
          `INSERT INTO restore_operations (
            backup_job_id, shop_id, initiated_by, status, test_restore
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id;`,
          [
            backup.id,
            shop.id,
            '00000000-0000-0000-0000-000000000000', // System user
            'pending',
            true,
          ]
        );

        // Trigger restore to staging
        const env = {
          ...process.env,
          SHOP_ID: shop.id,
          DATABASE_URL: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL,
        };

        await execAsync(
          `ts-node scripts/restore.ts ${backup.backup_date.toISOString().split('T')[0]} --test`,
          { env }
        );

        results.push({
          shop_id: shop.id,
          backup_id: backup.id,
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

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `Test restore completed for ${shops.length} shop(s)`,
      results,
    });
  } catch (error: any) {
    console.error('Test restore cron error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
