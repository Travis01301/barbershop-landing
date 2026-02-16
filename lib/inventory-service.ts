import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const serviceLogger = logger.createChild('inventory-service');

export interface InventoryItem {
  id: number;
  shop_id: number;
  item_name: string;
  category: string;
  description?: string;
  sku?: string;
  current_quantity: number;
  low_stock_threshold: number;
  unit_cost: number;
  reorder_quantity?: number;
  supplier_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  shop_id: number;
  item_id: number;
  transaction_type: 'add' | 'use' | 'adjust' | 'return';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  appointment_id?: number;
  notes?: string;
  created_by?: number;
  created_at: string;
}

export interface InventoryAlert {
  id: number;
  shop_id: number;
  item_id: number;
  alert_type: 'low_stock' | 'out_of_stock';
  current_quantity: number;
  threshold: number;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  shop_id: number;
  vendor_name: string;
  contact_email?: string;
  contact_phone?: string;
  last_order_date?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const inventoryService = {
  // ============ INVENTORY ITEMS ============

  /**
   * Add a new inventory item to the shop
   */
  async addInventoryItem(
    shop_id: number,
    item_name: string,
    category: string,
    unit_cost: number,
    opts: {
      description?: string;
      sku?: string;
      current_quantity?: number;
      low_stock_threshold?: number;
      reorder_quantity?: number;
      supplier_id?: number;
    } = {}
  ): Promise<InventoryItem> {
    try {
      const result = await query(
        `INSERT INTO inventory_items (
          shop_id, item_name, category, description, sku,
          current_quantity, low_stock_threshold, unit_cost,
          reorder_quantity, supplier_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          item_name,
          category,
          opts.description || null,
          opts.sku || null,
          opts.current_quantity || 0,
          opts.low_stock_threshold || 5,
          unit_cost,
          opts.reorder_quantity || null,
          opts.supplier_id || null,
          true,
        ]
      );

      const item = result.rows[0];
      serviceLogger.info('Inventory item added', {
        shop_id,
        item_name,
        sku: opts.sku,
      });

      return item;
    } catch (error) {
      serviceLogger.error('Failed to add inventory item', error);
      throw error;
    }
  },

  /**
   * Get all inventory items for a shop
   */
  async getInventoryItems(shop_id: number, filter?: { category?: string; is_active?: boolean }): Promise<InventoryItem[]> {
    try {
      let sql =
        'SELECT * FROM inventory_items WHERE shop_id = $1';
      const params: any[] = [shop_id];

      if (filter?.category) {
        sql += ' AND category = $' + (params.length + 1);
        params.push(filter.category);
      }

      if (filter?.is_active !== undefined) {
        sql += ' AND is_active = $' + (params.length + 1);
        params.push(filter.is_active);
      }

      sql += ' ORDER BY item_name ASC';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch inventory items', error);
      throw error;
    }
  },

  /**
   * Get a single inventory item by ID
   */
  async getInventoryItemById(id: number): Promise<InventoryItem | null> {
    try {
      const result = await query(
        'SELECT * FROM inventory_items WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      serviceLogger.error('Failed to fetch inventory item', error);
      throw error;
    }
  },

  /**
   * Update inventory item
   */
  async updateInventoryItem(
    id: number,
    updates: Partial<InventoryItem>
  ): Promise<InventoryItem> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'shop_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        throw new Error('Inventory item not found');
      }

      serviceLogger.info('Inventory item updated', { id });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to update inventory item', error);
      throw error;
    }
  },

  // ============ INVENTORY TRANSACTIONS ============

  /**
   * Record an inventory transaction (add/use/adjust/return)
   */
  async recordTransaction(
    shop_id: number,
    item_id: number,
    transaction_type: 'add' | 'use' | 'adjust' | 'return',
    quantity: number,
    opts: {
      unit_cost?: number;
      appointment_id?: number;
      notes?: string;
      created_by?: number;
    } = {}
  ): Promise<InventoryTransaction> {
    try {
      // Get the inventory item
      const item = await this.getInventoryItemById(item_id);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      // Calculate new quantity based on transaction type
      let quantityChange = 0;
      if (transaction_type === 'add' || transaction_type === 'return') {
        quantityChange = quantity;
      } else if (transaction_type === 'use' || transaction_type === 'adjust') {
        quantityChange = -quantity;
      }

      const newQuantity = Math.max(0, item.current_quantity + quantityChange);
      const total_cost = opts.unit_cost
        ? parseFloat((opts.unit_cost * quantity).toFixed(2))
        : null;

      // Record transaction
      const result = await query(
        `INSERT INTO inventory_transactions (
          shop_id, item_id, transaction_type, quantity, unit_cost,
          total_cost, appointment_id, notes, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          shop_id,
          item_id,
          transaction_type,
          quantity,
          opts.unit_cost || null,
          total_cost,
          opts.appointment_id || null,
          opts.notes || null,
          opts.created_by || null,
        ]
      );

      // Update inventory item quantity
      await query(
        'UPDATE inventory_items SET current_quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, item_id]
      );

      // Check if low stock threshold reached and create alert
      if (newQuantity <= item.low_stock_threshold && newQuantity > 0) {
        await this.createLowStockAlert(shop_id, item_id, newQuantity, item.low_stock_threshold);
      } else if (newQuantity === 0) {
        await this.createOutOfStockAlert(shop_id, item_id, 0, item.low_stock_threshold);
      }

      serviceLogger.info('Inventory transaction recorded', {
        item_id,
        transaction_type,
        quantity,
      });

      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to record inventory transaction', error);
      throw error;
    }
  },

  /**
   * Get transaction history for an item
   */
  async getTransactionHistory(
    shop_id: number,
    item_id: number,
    limit: number = 100
  ): Promise<InventoryTransaction[]> {
    try {
      const result = await query(
        `SELECT * FROM inventory_transactions
        WHERE shop_id = $1 AND item_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
        [shop_id, item_id, limit]
      );
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch transaction history', error);
      throw error;
    }
  },

  // ============ ALERTS ============

  /**
   * Create a low stock alert
   */
  async createLowStockAlert(
    shop_id: number,
    item_id: number,
    current_quantity: number,
    threshold: number
  ): Promise<InventoryAlert> {
    try {
      // Check if unacknowledged alert already exists
      const existing = await query(
        `SELECT id FROM inventory_alerts
        WHERE shop_id = $1 AND item_id = $2 AND is_acknowledged = false`,
        [shop_id, item_id]
      );

      if (existing.rows.length > 0) {
        // Alert already exists
        return existing.rows[0];
      }

      const result = await query(
        `INSERT INTO inventory_alerts (
          shop_id, item_id, alert_type, current_quantity, threshold, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *`,
        [shop_id, item_id, 'low_stock', current_quantity, threshold]
      );

      serviceLogger.info('Low stock alert created', { item_id, current_quantity, threshold });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create low stock alert', error);
      throw error;
    }
  },

  /**
   * Create an out of stock alert
   */
  async createOutOfStockAlert(
    shop_id: number,
    item_id: number,
    current_quantity: number,
    threshold: number
  ): Promise<InventoryAlert> {
    try {
      const result = await query(
        `INSERT INTO inventory_alerts (
          shop_id, item_id, alert_type, current_quantity, threshold, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *`,
        [shop_id, item_id, 'out_of_stock', current_quantity, threshold]
      );

      serviceLogger.warn('Out of stock alert created', { item_id });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create out of stock alert', error);
      throw error;
    }
  },

  /**
   * Get all active alerts for a shop
   */
  async getAlerts(
    shop_id: number,
    opts?: { acknowledged?: boolean }
  ): Promise<InventoryAlert[]> {
    try {
      let sql = 'SELECT * FROM inventory_alerts WHERE shop_id = $1';
      const params: any[] = [shop_id];

      if (opts?.acknowledged !== undefined) {
        sql += ` AND is_acknowledged = $${params.length + 1}`;
        params.push(opts.acknowledged);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch alerts', error);
      throw error;
    }
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alert_id: number,
    user_id?: number
  ): Promise<InventoryAlert> {
    try {
      const result = await query(
        `UPDATE inventory_alerts
        SET is_acknowledged = true, acknowledged_at = NOW(), acknowledged_by = $1
        WHERE id = $2
        RETURNING *`,
        [user_id || null, alert_id]
      );

      if (!result.rows[0]) {
        throw new Error('Alert not found');
      }

      serviceLogger.info('Alert acknowledged', { alert_id });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to acknowledge alert', error);
      throw error;
    }
  },

  // ============ COST ANALYSIS ============

  /**
   * Calculate cost per appointment
   * (total supplies used / total appointments)
   */
  async calculateCostPerAppointment(
    shop_id: number,
    from_date?: Date,
    to_date?: Date
  ): Promise<number> {
    try {
      // Get total cost of supplies used
      let costSql = `SELECT SUM(total_cost) as total_used_cost
        FROM inventory_transactions
        WHERE shop_id = $1 AND transaction_type = 'use'`;
      const costParams: any[] = [shop_id];

      if (from_date) {
        costSql += ` AND created_at >= $${costParams.length + 1}`;
        costParams.push(from_date);
      }
      if (to_date) {
        costSql += ` AND created_at <= $${costParams.length + 1}`;
        costParams.push(to_date);
      }

      const costResult = await query(costSql, costParams);
      const totalCost = parseFloat(costResult.rows[0]?.total_used_cost || 0);

      // Get total appointments count
      let appointmentSql = `SELECT COUNT(*) as total_appointments
        FROM appointments
        WHERE shop_id = $1`;
      const appointmentParams: any[] = [shop_id];

      if (from_date) {
        appointmentSql += ` AND created_at >= $${appointmentParams.length + 1}`;
        appointmentParams.push(from_date);
      }
      if (to_date) {
        appointmentSql += ` AND created_at <= $${appointmentParams.length + 1}`;
        appointmentParams.push(to_date);
      }

      const appointmentResult = await query(appointmentSql, appointmentParams);
      const totalAppointments = parseInt(appointmentResult.rows[0]?.total_appointments || 0);

      if (totalAppointments === 0) {
        return 0;
      }

      const costPerAppointment = parseFloat((totalCost / totalAppointments).toFixed(2));
      return costPerAppointment;
    } catch (error) {
      serviceLogger.error('Failed to calculate cost per appointment', error);
      throw error;
    }
  },

  /**
   * Get total inventory value
   */
  async getTotalInventoryValue(shop_id: number): Promise<number> {
    try {
      const result = await query(
        `SELECT SUM(current_quantity * unit_cost) as total_value
        FROM inventory_items
        WHERE shop_id = $1 AND is_active = true`,
        [shop_id]
      );

      const totalValue = parseFloat(result.rows[0]?.total_value || 0);
      return parseFloat(totalValue.toFixed(2));
    } catch (error) {
      serviceLogger.error('Failed to calculate total inventory value', error);
      throw error;
    }
  },

  // ============ SUPPLIERS ============

  /**
   * Add a new supplier
   */
  async addSupplier(
    shop_id: number,
    vendor_name: string,
    opts: {
      contact_email?: string;
      contact_phone?: string;
      website?: string;
      notes?: string;
    } = {}
  ): Promise<Supplier> {
    try {
      const result = await query(
        `INSERT INTO suppliers (
          shop_id, vendor_name, contact_email, contact_phone,
          website, notes, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          vendor_name,
          opts.contact_email || null,
          opts.contact_phone || null,
          opts.website || null,
          opts.notes || null,
          true,
        ]
      );

      serviceLogger.info('Supplier added', { shop_id, vendor_name });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to add supplier', error);
      throw error;
    }
  },

  /**
   * Get all suppliers for a shop
   */
  async getSuppliers(shop_id: number): Promise<Supplier[]> {
    try {
      const result = await query(
        `SELECT * FROM suppliers WHERE shop_id = $1 AND is_active = true
        ORDER BY vendor_name ASC`,
        [shop_id]
      );
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch suppliers', error);
      throw error;
    }
  },

  /**
   * Update supplier
   */
  async updateSupplier(
    id: number,
    updates: Partial<Supplier>
  ): Promise<Supplier> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'shop_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        throw new Error('Supplier not found');
      }

      serviceLogger.info('Supplier updated', { id });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to update supplier', error);
      throw error;
    }
  },

  /**
   * Record a reorder for an item
   */
  async createReorder(
    shop_id: number,
    item_id: number,
    quantity_ordered: number,
    opts: {
      supplier_id?: number;
      expected_delivery_date?: Date;
      unit_cost?: number;
      notes?: string;
      created_by?: number;
    } = {}
  ): Promise<any> {
    try {
      const item = await this.getInventoryItemById(item_id);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      const total_cost = opts.unit_cost
        ? parseFloat((opts.unit_cost * quantity_ordered).toFixed(2))
        : null;

      const result = await query(
        `INSERT INTO inventory_reorders (
          shop_id, item_id, supplier_id, quantity_ordered,
          unit_cost, total_cost, expected_delivery_date, notes,
          created_by, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          shop_id,
          item_id,
          opts.supplier_id || item.supplier_id || null,
          quantity_ordered,
          opts.unit_cost || null,
          total_cost,
          opts.expected_delivery_date || null,
          opts.notes || null,
          opts.created_by || null,
          'pending',
        ]
      );

      serviceLogger.info('Reorder created', { item_id, quantity_ordered });
      return result.rows[0];
    } catch (error) {
      serviceLogger.error('Failed to create reorder', error);
      throw error;
    }
  },

  /**
   * Get reorder history
   */
  async getReorders(
    shop_id: number,
    opts?: { status?: string }
  ): Promise<any[]> {
    try {
      let sql = `SELECT * FROM inventory_reorders WHERE shop_id = $1`;
      const params: any[] = [shop_id];

      if (opts?.status) {
        sql += ` AND status = $${params.length + 1}`;
        params.push(opts.status);
      }

      sql += ' ORDER BY order_date DESC';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      serviceLogger.error('Failed to fetch reorders', error);
      throw error;
    }
  },

  /**
   * Mark reorder as received
   */
  async markReorderReceived(
    reorder_id: number,
    item_id: number,
    quantity_received: number
  ): Promise<void> {
    try {
      // Update reorder status
      await query(
        `UPDATE inventory_reorders
        SET status = 'received', actual_delivery_date = NOW(), updated_at = NOW()
        WHERE id = $1`,
        [reorder_id]
      );

      // Add inventory transaction for received quantity
      await this.recordTransaction(
        (
          await query('SELECT shop_id FROM inventory_reorders WHERE id = $1', [reorder_id])
        ).rows[0].shop_id,
        item_id,
        'add',
        quantity_received,
        { notes: `Reorder #${reorder_id} received` }
      );

      serviceLogger.info('Reorder marked as received', { reorder_id });
    } catch (error) {
      serviceLogger.error('Failed to mark reorder as received', error);
      throw error;
    }
  },
};
