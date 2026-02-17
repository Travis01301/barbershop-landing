// OAuth Manager - Handles OAuth 2.0 flows for all providers
const crypto = require('crypto');
const axios = require('axios');

class OAuthManager {
  constructor(pool, encryptionKey) {
    this.pool = pool;
    this.encryptionKey = encryptionKey;
    this.providers = {
      google_calendar: require('./GoogleOAuthProvider'),
      outlook_calendar: require('./MicrosoftOAuthProvider'),
      shopify: require('./ShopifyOAuthProvider'),
      zapier: require('./ZapierOAuthProvider'),
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(provider, businessId, redirectUri) {
    const ProviderClass = this.providers[provider];
    if (!ProviderClass) throw new Error(`Unknown provider: ${provider}`);

    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state for validation during callback
    await this.pool.query(
      `INSERT INTO oauth_state (state, provider, business_id, expires_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [state, provider, businessId]
    );

    const authUrl = ProviderClass.getAuthorizationUrl(state, redirectUri);
    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(provider, code, state, businessId) {
    // Validate state
    const stateResult = await this.pool.query(
      `SELECT * FROM oauth_state 
       WHERE state = $1 AND provider = $2 AND expires_at > NOW()`,
      [state, provider]
    );

    if (stateResult.rows.length === 0) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Remove used state
    await this.pool.query('DELETE FROM oauth_state WHERE state = $1', [state]);

    // Exchange code for tokens
    const ProviderClass = this.providers[provider];
    const tokens = await ProviderClass.exchangeCodeForTokens(code);

    // Store encrypted tokens
    const integrationResult = await this.pool.query(
      `SELECT id FROM integrations WHERE business_id = $1 AND provider = $2`,
      [businessId, provider]
    );

    if (integrationResult.rows.length === 0) {
      throw new Error('Integration not found');
    }

    const integrationId = integrationResult.rows[0].id;

    // Encrypt tokens
    const encryptedAccessToken = this.encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token 
      ? this.encryptToken(tokens.refresh_token)
      : null;

    // Store OAuth connection
    await this.pool.query(
      `INSERT INTO oauth_connections 
       (integration_id, provider, access_token, refresh_token, token_expires_at, scope, user_email, is_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (integration_id) DO UPDATE SET
       access_token = $3, refresh_token = $4, token_expires_at = $5, updated_at = NOW()`,
      [
        integrationId,
        provider,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokens.expires_at,
        tokens.scope,
        tokens.user_email,
        true,
      ]
    );

    // Update integration status
    await this.pool.query(
      `UPDATE integrations SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [integrationId]
    );

    return {
      success: true,
      integration_id: integrationId,
      provider,
      user_email: tokens.user_email,
    };
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(integrationId, provider) {
    const result = await this.pool.query(
      `SELECT * FROM oauth_connections WHERE integration_id = $1 AND provider = $2`,
      [integrationId, provider]
    );

    if (result.rows.length === 0) {
      throw new Error('OAuth connection not found');
    }

    const connection = result.rows[0];
    const refreshToken = this.decryptToken(connection.refresh_token);

    const ProviderClass = this.providers[provider];
    const newTokens = await ProviderClass.refreshTokens(refreshToken);

    const encryptedAccessToken = this.encryptToken(newTokens.access_token);
    const encryptedRefreshToken = newTokens.refresh_token 
      ? this.encryptToken(newTokens.refresh_token)
      : connection.refresh_token;

    await this.pool.query(
      `UPDATE oauth_connections 
       SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = NOW()
       WHERE integration_id = $4`,
      [
        encryptedAccessToken,
        encryptedRefreshToken,
        newTokens.expires_at,
        integrationId,
      ]
    );

    return newTokens;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(integrationId, provider) {
    const result = await this.pool.query(
      `SELECT * FROM oauth_connections WHERE integration_id = $1 AND provider = $2`,
      [integrationId, provider]
    );

    if (result.rows.length === 0) {
      throw new Error('OAuth connection not found');
    }

    const connection = result.rows[0];
    const expiresAt = new Date(connection.token_expires_at);

    if (expiresAt < new Date()) {
      // Token expired, refresh it
      await this.refreshAccessToken(integrationId, provider);
      return this.getValidAccessToken(integrationId, provider); // Recursive call to get new token
    }

    return this.decryptToken(connection.access_token);
  }

  /**
   * Disconnect OAuth connection
   */
  async disconnect(integrationId) {
    await this.pool.query(
      `DELETE FROM oauth_connections WHERE integration_id = $1`,
      [integrationId]
    );

    await this.pool.query(
      `UPDATE integrations SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
      [integrationId]
    );
  }

  /**
   * Encryption utilities
   */
  encryptToken(token) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptToken(encryptedToken) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = OAuthManager;
