// Integration Management Routes
const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  /**
   * GET /api/integrations
   * List all integrations for a business
   */
  router.get('/', async (req, res) => {
    try {
      const businessId = req.headers['x-business-id'];
      if (!businessId) {
        return res.status(400).json({ error: 'Missing x-business-id header' });
      }

      const result = await pool.query(
        `SELECT id, provider, status, config, last_sync, sync_status, enabled_triggers, enabled_actions
         FROM integrations WHERE business_id = $1`,
        [businessId]
      );

      res.json({
        success: true,
        integrations: result.rows,
      });
    } catch (error) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * GET /api/integrations/:id
   * Get integration details
   */
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM integrations WHERE id = $1`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        integration: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching integration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/integrations
   * Create a new integration
   */
  router.post('/', async (req, res) => {
    try {
      const businessId = req.headers['x-business-id'];
      const { provider, config } = req.body;

      if (!businessId || !provider || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await pool.query(
        `INSERT INTO integrations (business_id, provider, config, status)
         VALUES ($1, $2, $3, 'inactive')
         RETURNING *`,
        [businessId, provider, JSON.stringify(config)]
      );

      res.status(201).json({
        success: true,
        integration: result.rows[0],
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      
      if (error.message.includes('unique')) {
        return res.status(409).json({ error: 'Integration already exists for this provider' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/integrations/:id
   * Update integration configuration
   */
  router.put('/:id', async (req, res) => {
    try {
      const { config, enabled_triggers, enabled_actions, webhook_url } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (config) {
        updates.push(`config = $${paramCount}`);
        values.push(JSON.stringify(config));
        paramCount++;
      }

      if (enabled_triggers) {
        updates.push(`enabled_triggers = $${paramCount}`);
        values.push(enabled_triggers);
        paramCount++;
      }

      if (enabled_actions) {
        updates.push(`enabled_actions = $${paramCount}`);
        values.push(enabled_actions);
        paramCount++;
      }

      if (webhook_url) {
        updates.push(`webhook_url = $${paramCount}`);
        values.push(webhook_url);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);

      values.push(req.params.id);

      const query = `UPDATE integrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        integration: result.rows[0],
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/integrations/:id
   * Delete integration
   */
  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `DELETE FROM integrations WHERE id = $1 RETURNING id`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        message: 'Integration deleted',
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/integrations/:id/disconnect
   * Disconnect OAuth connection
   */
  router.post('/:id/disconnect', async (req, res) => {
    try {
      // This would use OAuthManager to disconnect
      await pool.query(
        `DELETE FROM oauth_connections WHERE integration_id = $1`,
        [req.params.id]
      );

      await pool.query(
        `UPDATE integrations SET status = 'inactive' WHERE id = $1`,
        [req.params.id]
      );

      res.json({
        success: true,
        message: 'Integration disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
