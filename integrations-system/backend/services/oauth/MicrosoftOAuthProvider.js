// Microsoft OAuth Provider (for Outlook Calendar & Office 365)
const axios = require('axios');
const jwt = require('jsonwebtoken');

class MicrosoftOAuthProvider {
  static getAuthorizationUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'Calendars.ReadWrite',
        'offline_access',
        'email',
        'profile',
        'openid',
      ].join(' '),
      state,
      prompt: 'select_account',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code) {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        scope: 'Calendars.ReadWrite offline_access email profile openid',
      }
    );

    const { access_token, refresh_token, expires_in, id_token } = response.data;

    // Decode ID token to get user info
    const decoded = jwt.decode(id_token);
    const userEmail = decoded?.preferred_username || decoded?.email;

    return {
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: response.data.scope,
      user_email: userEmail,
      provider_user_id: decoded?.oid,
    };
  }

  static async refreshTokens(refreshToken) {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Calendars.ReadWrite offline_access email profile openid',
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    return {
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: response.data.scope,
    };
  }

  static async getUserInfo(accessToken) {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      email: response.data.userPrincipalName || response.data.mail,
      displayName: response.data.displayName,
      id: response.data.id,
    };
  }
}

module.exports = MicrosoftOAuthProvider;
