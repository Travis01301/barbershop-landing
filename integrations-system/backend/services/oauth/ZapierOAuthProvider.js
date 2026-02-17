// Zapier OAuth Provider
const axios = require('axios');

class ZapierOAuthProvider {
  static getAuthorizationUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.ZAPIER_CLIENT_ID,
      response_type: 'code',
      scope: 'read write',
      state,
      redirect_uri: redirectUri,
    });

    return `https://zapier.com/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code) {
    const response = await axios.post('https://zapier.com/oauth/token', {
      client_id: process.env.ZAPIER_CLIENT_ID,
      client_secret: process.env.ZAPIER_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = response.data;

    return {
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: 'read write',
      user_email: null, // Zapier doesn't return user email in token response
      provider_user_id: null,
    };
  }

  static async refreshTokens(refreshToken) {
    const response = await axios.post('https://zapier.com/oauth/token', {
      client_id: process.env.ZAPIER_CLIENT_ID,
      client_secret: process.env.ZAPIER_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, refresh_token, expires_in } = response.data;

    return {
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: 'read write',
    };
  }

  /**
   * Get Zapier app info for Zapier Platform
   */
  static async getAppInfo(accessToken) {
    const response = await axios.get('https://zapier.com/api/v1/apps', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }
}

module.exports = ZapierOAuthProvider;
