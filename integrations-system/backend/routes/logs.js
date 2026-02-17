// Integration Logs Routes
const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  /**
   * GET /api/logs/:integration_id
   * Get integration logs
   */
  router.get('/:integration_id', async (req, res) => {
    try {
      const { event_type, status, action, limit = 100, offset = 0 } = req.query;

      let query = `SELECT * FROM integration_logs WHERE integration_id = $1`;
      const values = [req.params.integration_id];
      let paramCount = 2;

      if (event_type) {
        query += ` AND event_type = $${paramCount}`;
        values.push(event_type);
        paramCount++;
      }

      if (status) {
        query += ` AND status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (action) {
        query += ` AND action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      res.json({
        success: true,
        logs: result.rows,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/logs/:integration_id/:log_id
   * Get specific log details
   */
  router.get('/:integration_id/:log_id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM integration_logs 
         WHERE id = $1 AND integration_id = $2`,
        [req.params.log_id, req.params.integration_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      res.json({
        success: true,
        log: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching log:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/logs/:integration_id/stats
   * Get integration log statistics
   */
  router.get('/:integration_id/stats', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          event_type,
          status,
          COUNT(*) as count,
          MAX(created_at) as last_event
         FROM integration_logs 
         WHERE integration_id = $1
         GROUP BY event_type, status`,
        [req.params.integration_id]
      );

      // Calculate summary statistics
      const summary = {
        total_events: 0,
        by_type: {},
        by_status: {},
      };

      result.rows.forEach(row => {
        summary.total_events += row.count;

        if (!summary.by_type[row.event_type]) {
          summary.by_type[row.event_type] = 0;
        }
        summary.by_type[row.event_type] += row.count;

        if (!summary.by_status[row.status]) {
          summary.by_status[row.status] = 0;
        }
        summary.by_status[row.status] += row.count;
      });

      res.json({
        success: true,
        stats: summary,
        details: result.rows,
      });
    } catch (error) {
      console.error('Error fetching log stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/logs/:integration_id/errors
   * Get recent errors
   */
  router.get('/:integration_id/errors', async (req, res) => {
    try {
      const { limit = 50 } = req.query;

      const result = await pool.query(
        `SELECT id, event_type, action, error_message, error_code, created_at 
         FROM integration_logs 
         WHERE integration_id = $1 AND status = 'failed'
         ORDER BY created_at DESC 
         LIMIT $2`,
        [req.params.integration_id, limit]
      );

      res.json({
        success: true,
        errors: result.rows,
      });
    } catch (error) {
      console.error('Error fetching errors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/logs/:integration_id/:log_id/retry
   * Retry failed sync
   */
  router.post('/:integration_id/:log_id/retry', async (req, res) => {
    try {
      const logResult = await pool.query(
        `SELECT * FROM integration_logs WHERE id = $1`,
        [req.params.log_id]
      );

      if (logResult.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      const log = logResult.rows[0];

      if (log.retry_count >= 5) {
        return res.status(400).json({ error: 'Maximum retries exceeded' });
      }

      // Update retry count and reset status
      await pool.query(
        `UPDATE integration_logs 
         SET status = 'pending', retry_count = retry_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [req.params.log_id]
      );

      // Queue for retry (would go to job queue)
      console.log(`Queuing retry for log ${req.params.log_id}`);

      res.json({
        success: true,
        message: 'Retry queued',
      });
    } catch (error) {
      console.error('Error retrying sync:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/logs/:integration_id
   * Clear old logs (for maintenance)
   */
  router.delete('/:integration_id', async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const result = await pool.query(
        `DELETE FROM integration_logs 
         WHERE integration_id = $1 
         AND created_at < NOW() - INTERVAL '${parseInt(days)} days'`,
        [req.params.integration_id]
      );

      res.json({
        success: true,
        deleted_count: result.rowCount,
      });
    } catch (error) {
      console.error('Error deleting logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
