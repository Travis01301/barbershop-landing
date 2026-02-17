// Sync Routes
const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  /**
   * POST /api/sync/:integration_id/trigger
   * Manually trigger a sync
   */
  router.post('/:integration_id/trigger', async (req, res) => {
    try {
      const integrationId = req.params.integration_id;
      const { provider, action } = req.body;

      if (!provider || !action) {
        return res.status(400).json({ error: 'Missing provider or action' });
      }

      // Verify integration exists
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1`,
        [integrationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Update sync status
      await pool.query(
        `UPDATE integrations SET sync_status = 'pending' WHERE id = $1`,
        [integrationId]
      );

      // Queue sync job (would typically go to a job queue like Bull/RabbitMQ)
      console.log(`Queuing sync: ${provider} - ${action} for integration ${integrationId}`);

      res.json({
        success: true,
        message: `Sync triggered for ${provider} - ${action}`,
      });
    } catch (error) {
      console.error('Error triggering sync:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/sync/:integration_id/status
   * Get current sync status
   */
  router.get('/:integration_id/status', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, provider, sync_status, last_sync FROM integrations WHERE id = $1`,
        [req.params.integration_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        sync: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/sync/calendar/appointment
   * Sync appointment to calendar
   */
  router.post('/calendar/appointment', async (req, res) => {
    try {
      const { integration_id, appointment_id, provider } = req.body;

      if (!integration_id || !appointment_id || !provider) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // This would use CalendarSyncService
      console.log(`Syncing appointment ${appointment_id} to ${provider}`);

      res.json({
        success: true,
        message: 'Appointment sync queued',
      });
    } catch (error) {
      console.error('Error syncing appointment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/sync/shopify/order
   * Sync Shopify order to appointment
   */
  router.post('/shopify/order', async (req, res) => {
    try {
      const { integration_id, order_id, appointment_id } = req.body;

      if (!integration_id || !order_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // This would use ShopifySyncService
      console.log(`Syncing Shopify order ${order_id} to appointment ${appointment_id}`);

      res.json({
        success: true,
        message: 'Order sync queued',
      });
    } catch (error) {
      console.error('Error syncing order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/sync/calendar/:integration_id/tracking
   * Get calendar sync tracking records
   */
  router.get('/calendar/:integration_id/tracking', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM calendar_sync_tracking 
         WHERE integration_id = $1 
         ORDER BY last_synced_at DESC 
         LIMIT 100`,
        [req.params.integration_id]
      );

      res.json({
        success: true,
        tracking: result.rows,
      });
    } catch (error) {
      console.error('Error fetching calendar sync tracking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/sync/shopify/:integration_id/tracking
   * Get Shopify sync tracking records
   */
  router.get('/shopify/:integration_id/tracking', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM shopify_sync_tracking 
         WHERE integration_id = $1 
         ORDER BY synced_at DESC 
         LIMIT 100`,
        [req.params.integration_id]
      );

      res.json({
        success: true,
        tracking: result.rows,
      });
    } catch (error) {
      console.error('Error fetching Shopify sync tracking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
