// Shopify OAuth Provider
const axios = require('axios');
const crypto = require('crypto');

class ShopifyOAuthProvider {
  static getAuthorizationUrl(state, redirectUri, shopifyShop) {
    const scopes = [
      'write_products',
      'read_products',
      'write_orders',
      'read_orders',
      'write_inventory',
      'read_inventory',
    ].join(',');

    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });

    return `https://${shopifyShop}.myshopify.com/admin/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code, shopifyShop) {
    const response = await axios.post(
      `https://${shopifyShop}.myshopify.com/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }
    );

    const { access_token, scope } = response.data;

    // Get shop info
    const shopInfo = await this.getShopInfo(shopifyShop, access_token);

    return {
      access_token,
      refresh_token: null, // Shopify uses long-lived tokens
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      scope,
      user_email: shopInfo.email,
      provider_user_id: shopInfo.shop_id,
    };
  }

  static async getShopInfo(shopifyShop, accessToken) {
    const response = await axios.get(
      `https://${shopifyShop}.myshopify.com/admin/api/2024-01/shop.json`,
      {
        headers: { 'X-Shopify-Access-Token': accessToken },
      }
    );

    return {
      shop_id: response.data.shop.id,
      email: response.data.shop.email,
      shop_name: response.data.shop.name,
      myshopify_domain: response.data.shop.myshopify_domain,
    };
  }

  static async validateWebhookSignature(req, secret) {
    const hmacHeader = req.get('x-shopify-hmac-sha256');
    if (!hmacHeader) return false;

    const body = req.rawBody || req.body;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    return hash === hmacHeader;
  }
}

module.exports = ShopifyOAuthProvider;
