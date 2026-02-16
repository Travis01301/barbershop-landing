-- Inventory Tracking System Migration
-- Tables for managing supplies, stock levels, costs, and supplier information

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  last_order_date TIMESTAMP,
  website VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- clippers, shears, razors, products, chemicals
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit_cost NUMERIC(10,2) NOT NULL,
  reorder_quantity INTEGER,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_shop_id ON inventory_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON inventory_items(supplier_id);

-- Inventory transactions table (add/use/adjust stock)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'add', 'use', 'adjust', 'return'
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_shop_id ON inventory_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_appointment_id ON inventory_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

-- Low stock alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock'
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_shop_id ON inventory_alerts(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item_id ON inventory_alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_is_acknowledged ON inventory_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created_at ON inventory_alerts(created_at);

-- Reorder history table
CREATE TABLE IF NOT EXISTS inventory_reorders (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_delivery_date TIMESTAMP,
  actual_delivery_date TIMESTAMP,
  quantity_ordered INTEGER NOT NULL,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, received, cancelled
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_reorders_shop_id ON inventory_reorders(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorders_item_id ON inventory_reorders(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorders_supplier_id ON inventory_reorders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reorders_status ON inventory_reorders(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reorders_order_date ON inventory_reorders(order_date);
