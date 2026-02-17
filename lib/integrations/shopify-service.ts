import { BaseIntegration, OAuthConfig, TokenResponse } from './base-integration';

// Shopify API Documentation
// https://shopify.dev/api/admin-rest

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  price: string;
  handle: string;
}

export interface ShopifyOrder {
  id: string;
  order_number: number;
  customer: { id: string; email: string; first_name: string; last_name: string };
  line_items: Array<{
    id: string;
    product_id: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  total_price: string;
  created_at: string;
}

export interface ShopifyWebhook {
  id: string;
  topic: string;
  address: string;
  format: string;
  created_at: string;
  updated_at: string;
}

export class ShopifyIntegration extends BaseIntegration {
  private scopes = ['read_products', 'read_orders', 'write_orders'];
  private shopifyApiVersion = '2024-01';

  constructor(config: OAuthConfig) {
    super('Shopify', config);
  }

  getAuthUrl(state: string, shop: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.scopes.join(','),
      redirect_uri: this.config.redirectUri,
      state,
    });
    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, shop: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
        }),
      });

      if (!response.ok) {
        throw new Error(`Shopify token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        accessToken: data.access_token,
        expiresIn: 86400, // Shopify tokens don't expire, use 1 day as default
        expiresAt: new Date(Date.now() + 86400 * 1000),
      };
    } catch (error) {
      this.logError('Failed to exchange code for token', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<TokenResponse> {
    // Shopify tokens don't refresh; we need to re-authorize
    throw new Error('Shopify does not use token refresh. Please re-authorize.');
  }

  async validateToken(accessToken: string, shop: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${shop}/admin/api/${this.shopifyApiVersion}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getProducts(accessToken: string, shop: string): Promise<ShopifyProduct[]> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${this.shopifyApiVersion}/products.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify products: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.products || [];
    } catch (error) {
      this.logError('Failed to fetch Shopify products', error);
      throw error;
    }
  }

  async getOrders(accessToken: string, shop: string, status: string = 'any'): Promise<ShopifyOrder[]> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${this.shopifyApiVersion}/orders.json?status=${status}&limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Shopify orders: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.orders || [];
    } catch (error) {
      this.logError('Failed to fetch Shopify orders', error);
      throw error;
    }
  }

  async registerWebhook(
    accessToken: string,
    shop: string,
    topic: string,
    address: string
  ): Promise<ShopifyWebhook> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${this.shopifyApiVersion}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address,
              format: 'json',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to register Shopify webhook: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.webhook;
    } catch (error) {
      this.logError('Failed to register Shopify webhook', error);
      throw error;
    }
  }

  async unregisterWebhook(
    accessToken: string,
    shop: string,
    webhookId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${this.shopifyApiVersion}/webhooks/${webhookId}.json`,
        {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to unregister Shopify webhook: ${response.statusText}`);
      }
    } catch (error) {
      this.logError('Failed to unregister Shopify webhook', error);
      throw error;
    }
  }

  async createOrder(
    accessToken: string,
    shop: string,
    order: Record<string, any>
  ): Promise<ShopifyOrder> {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${this.shopifyApiVersion}/orders.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create Shopify order: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.order;
    } catch (error) {
      this.logError('Failed to create Shopify order', error);
      throw error;
    }
  }

  logError(message: string, error: any): void {
    console.error(`[Shopify Integration] ${message}`, error);
  }
}
