// Google OAuth Provider
const axios = require('axios');

class GoogleOAuthProvider {
  static getAuthorizationUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.readonly',
        'openid',
        'email',
        'profile',
      ].join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Get user email from ID token
    let userEmail = null;
    if (response.data.id_token) {
      const decoded = JSON.parse(
        Buffer.from(response.data.id_token.split('.')[1], 'base64').toString()
      );
      userEmail = decoded.email;
    }

    return {
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: response.data.scope,
      user_email: userEmail,
      provider_user_id: decoded?.sub,
    };
  }

  static async refreshTokens(refreshToken) {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;

    return {
      access_token,
      refresh_token: refreshToken, // Google doesn't return new refresh token
      expires_at: new Date(Date.now() + expires_in * 1000),
      scope: response.data.scope,
    };
  }

  static async getUserEmail(accessToken) {
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data.email;
  }
}

module.exports = GoogleOAuthProvider;
