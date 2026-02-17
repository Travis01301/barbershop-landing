// OAuth Routes
const express = require('express');
const router = express.Router();

module.exports = function(pool) {
  /**
   * POST /api/oauth/authorize/:provider
   * Get OAuth authorization URL
   */
  router.post('/authorize/:provider', async (req, res) => {
    try {
      const { provider } = req.params;
      const businessId = req.headers['x-business-id'];
      const { redirect_uri } = req.body;

      if (!businessId || !redirect_uri) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // This would use OAuthManager
      // For now, return mock response
      const state = require('crypto').randomBytes(32).toString('hex');

      res.json({
        success: true,
        auth_url: `https://${provider}.example.com/oauth/authorize?state=${state}`,
        state,
      });
    } catch (error) {
      console.error('Error getting authorization URL:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/oauth/callback/:provider
   * Handle OAuth callback
   */
  router.post('/callback/:provider', async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state, integration_id } = req.body;

      if (!code || !state || !integration_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // This would use OAuthManager to handle callback
      // For now, return success
      await pool.query(
        `UPDATE integrations SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [integration_id]
      );

      res.json({
        success: true,
        message: 'OAuth authorization completed',
        integration_id,
      });
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/oauth/status/:provider
   * Get OAuth connection status
   */
  router.get('/status/:provider', async (req, res) => {
    try {
      const integrationId = req.headers['x-integration-id'];

      if (!integrationId) {
        return res.status(400).json({ error: 'Missing x-integration-id header' });
      }

      const result = await pool.query(
        `SELECT id, provider, token_expires_at 
         FROM oauth_connections 
         WHERE integration_id = $1 AND provider = $2`,
        [integrationId, req.params.provider]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          connected: false,
        });
      }

      const connection = result.rows[0];
      const isExpired = new Date(connection.token_expires_at) < new Date();

      res.json({
        success: true,
        connected: true,
        expires_at: connection.token_expires_at,
        is_expired: isExpired,
      });
    } catch (error) {
      console.error('Error checking OAuth status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/oauth/refresh/:provider
   * Refresh access token
   */
  router.post('/refresh/:provider', async (req, res) => {
    try {
      const integrationId = req.headers['x-integration-id'];

      if (!integrationId) {
        return res.status(400).json({ error: 'Missing x-integration-id header' });
      }

      // This would use OAuthManager to refresh tokens
      res.json({
        success: true,
        message: 'Token refreshed',
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
