// Shopify Sync Service - Handles product sales and revenue tracking
const axios = require('axios');

class ShopifySyncService {
  constructor(pool, oauthManager) {
    this.pool = pool;
    this.oauthManager = oauthManager;
  }

  /**
   * Get Shopify store info
   */
  async getShopInfo(integrationId) {
    const result = await this.pool.query(
      `SELECT config FROM integrations WHERE id = $1 AND provider = 'shopify'`,
      [integrationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Shopify integration not found');
    }

    return result.rows[0].config;
  }

  /**
   * Get Shopify API client
   */
  async getShopifyClient(integrationId) {
    const config = await this.getShopInfo(integrationId);
    const accessToken = await this.oauthManager.getValidAccessToken(
      integrationId,
      'shopify'
    );

    return new ShopifyApiClient(config.shop_domain, accessToken);
  }

  /**
   * Sync product sales from Shopify to appointment
   */
  async syncOrderToAppointment(integrationId, orderId, appointmentId) {
    const client = await this.getShopifyClient(integrationId);

    try {
      // Get order from Shopify
      const order = await client.getOrder(orderId);

      // Extract revenue data
      const productRevenue = order.total_price - (order.total_shipping || 0) - (order.total_tax || 0);

      // Store sync record
      await this.pool.query(
        `INSERT INTO shopify_sync_tracking 
         (integration_id, appointment_id, order_id, total_revenue, product_revenue, synced_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (integration_id, appointment_id) DO UPDATE SET
         order_id = $3, total_revenue = $4, product_revenue = $5, synced_at = NOW()`,
        [integrationId, appointmentId, orderId, order.total_price, productRevenue]
      );

      await this.logSync(integrationId, 'shopify_sync', 'order_to_appointment', 'success', {
        order_id: orderId,
        appointment_id: appointmentId,
        total_revenue: order.total_price,
      });

      return {
        success: true,
        total_revenue: order.total_price,
        product_revenue: productRevenue,
      };
    } catch (error) {
      console.error('Error syncing order to appointment:', error);

      await this.logSync(integrationId, 'shopify_sync', 'order_to_appointment', 'failed',
        { order_id: orderId, appointment_id: appointmentId },
        error.message
      );

      throw error;
    }
  }

  /**
   * Get orders for date range (for revenue reports)
   */
  async getOrdersForDateRange(integrationId, startDate, endDate) {
    const client = await this.getShopifyClient(integrationId);

    try {
      const orders = await client.getOrdersByDateRange(startDate, endDate);

      // Calculate revenue by product/variant
      const revenueBreakdown = this.calculateRevenueBreakdown(orders);

      await this.logSync(integrationId, 'shopify_sync', 'revenue_report', 'success', {
        order_count: orders.length,
        date_range: { start: startDate, end: endDate },
        total_revenue: revenueBreakdown.total,
      });

      return {
        success: true,
        orders,
        revenue_breakdown: revenueBreakdown,
      };
    } catch (error) {
      console.error('Error fetching orders:', error);

      await this.logSync(integrationId, 'shopify_sync', 'revenue_report', 'failed',
        { start_date: startDate, end_date: endDate },
        error.message
      );

      throw error;
    }
  }

  /**
   * Sync inventory from Shopify
   */
  async syncInventory(integrationId) {
    const client = await this.getShopifyClient(integrationId);

    try {
      const products = await client.getAllProducts();

      // Store inventory data (would integrate with your inventory system)
      const inventory = this.parseInventory(products);

      await this.logSync(integrationId, 'shopify_sync', 'inventory_sync', 'success', {
        product_count: products.length,
        inventory_items: inventory.length,
      });

      return {
        success: true,
        products: inventory,
      };
    } catch (error) {
      console.error('Error syncing inventory:', error);

      await this.logSync(integrationId, 'shopify_sync', 'inventory_sync', 'failed',
        {},
        error.message
      );

      throw error;
    }
  }

  /**
   * Get barber revenue summary
   */
  async getBarberRevenueSummary(integrationId, barberId, startDate, endDate) {
    const result = await this.pool.query(
      `SELECT 
        barber_id,
        COUNT(*) as appointment_count,
        SUM(service_revenue) as service_revenue,
        SUM(product_revenue) as product_revenue,
        SUM(total_revenue) as total_revenue
       FROM shopify_sync_tracking
       WHERE integration_id = $1 AND barber_id = $2 
       AND synced_at >= $3 AND synced_at <= $4
       GROUP BY barber_id`,
      [integrationId, barberId, startDate, endDate]
    );

    return result.rows[0] || {
      barber_id: barberId,
      appointment_count: 0,
      service_revenue: 0,
      product_revenue: 0,
      total_revenue: 0,
    };
  }

  /**
   * Helper: Calculate revenue breakdown
   */
  calculateRevenueBreakdown(orders) {
    const breakdown = {
      total: 0,
      by_product: {},
      by_variant: {},
    };

    orders.forEach(order => {
      breakdown.total += parseFloat(order.total_price);

      order.line_items.forEach(item => {
        const productKey = item.product_id;
        const variantKey = item.variant_id;

        if (!breakdown.by_product[productKey]) {
          breakdown.by_product[productKey] = {
            title: item.title,
            quantity: 0,
            revenue: 0,
          };
        }

        breakdown.by_product[productKey].quantity += item.quantity;
        breakdown.by_product[productKey].revenue += parseFloat(item.price) * item.quantity;

        if (!breakdown.by_variant[variantKey]) {
          breakdown.by_variant[variantKey] = {
            title: item.title,
            quantity: 0,
            revenue: 0,
          };
        }

        breakdown.by_variant[variantKey].quantity += item.quantity;
        breakdown.by_variant[variantKey].revenue += parseFloat(item.price) * item.quantity;
      });
    });

    return breakdown;
  }

  /**
   * Helper: Parse inventory
   */
  parseInventory(products) {
    return products.flatMap(product =>
      product.variants.map(variant => ({
        product_id: product.id,
        product_title: product.title,
        variant_id: variant.id,
        variant_title: variant.title,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity,
        price: variant.price,
      }))
    );
  }

  /**
   * Helper: Log sync
   */
  async logSync(integrationId, eventType, action, status, data, errorMessage = null) {
    await this.pool.query(
      `INSERT INTO integration_logs 
       (integration_id, event_type, action, status, request_data, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [integrationId, eventType, action, status, JSON.stringify(data), errorMessage]
    );
  }
}

/**
 * Shopify API Client
 */
class ShopifyApiClient {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.baseUrl = `https://${shopDomain}/admin/api/2024-01`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };
  }

  async getOrder(orderId) {
    const response = await axios.get(
      `${this.baseUrl}/orders/${orderId}.json`,
      { headers: this.headers }
    );
    return response.data.order;
  }

  async getOrdersByDateRange(startDate, endDate) {
    const response = await axios.get(
      `${this.baseUrl}/orders.json?status=any&created_at_min=${startDate}&created_at_max=${endDate}`,
      { headers: this.headers }
    );
    return response.data.orders;
  }

  async getAllProducts() {
    const response = await axios.get(
      `${this.baseUrl}/products.json?limit=250`,
      { headers: this.headers }
    );
    return response.data.products;
  }

  async getProductVariants(productId) {
    const response = await axios.get(
      `${this.baseUrl}/products/${productId}/variants.json`,
      { headers: this.headers }
    );
    return response.data.variants;
  }
}

module.exports = ShopifySyncService;
