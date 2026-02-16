import { query, getClient } from './db';
import { logger } from './logger';

const log = logger.createChild('multi-location-service');

export interface LocationHierarchy {
  id: number;
  name: string;
  slug: string;
  parentShopId: number | null;
  isParentLocation: boolean;
  locationType: 'parent' | 'franchise' | 'standalone';
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSettings {
  shopId: number;
  businessHours?: Record<string, { open: string; close: string }>;
  services?: any[];
  staffAssignments?: any[];
  paymentMethods?: string[];
  customRules?: Record<string, any>;
}

export interface StaffLocationAssignment {
  id: number;
  userId: number;
  shopId: number;
  primaryLocation: boolean;
  startDate: string;
  endDate?: string;
  assignmentType: 'regular' | 'temporary' | 'contract';
  createdAt: string;
  updatedAt: string;
}

export interface CrossLocationTransfer {
  id: number;
  userId: number;
  fromShopId: number;
  toShopId: number;
  transferDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new location (child of existing parent)
 */
export async function createLocation(
  data: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    parentShopId?: number;
  }
): Promise<LocationHierarchy> {
  try {
    const result = await query<any>(
      `
      INSERT INTO shops (name, slug, address, phone, email, parent_shop_id, location_type, is_parent_location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, slug, parent_shop_id, is_parent_location, location_type, address, phone, email, created_at, updated_at
      `,
      [
        data.name,
        data.slug,
        data.address || null,
        data.phone || null,
        data.email || null,
        data.parentShopId || null,
        data.parentShopId ? 'franchise' : 'standalone',
        !data.parentShopId,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to create location');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentShopId: row.parent_shop_id,
      isParentLocation: row.is_parent_location,
      locationType: row.location_type,
      address: row.address,
      phone: row.phone,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    log.error('Failed to create location', err);
    throw err;
  }
}

/**
 * Get all locations with optional filtering
 */
export async function getLocations(
  shopId?: number,
  parentShopId?: number
): Promise<LocationHierarchy[]> {
  try {
    let sql = 'SELECT id, name, slug, parent_shop_id, is_parent_location, location_type, address, phone, email, created_at, updated_at FROM shops WHERE 1=1';
    const params: any[] = [];

    if (shopId) {
      sql += ` AND id = $${params.length + 1}`;
      params.push(shopId);
    }

    if (parentShopId) {
      sql += ` AND (parent_shop_id = $${params.length + 1} OR id = $${params.length + 1})`;
      params.push(parentShopId);
    }

    sql += ' ORDER BY parent_shop_id, name';

    const result = await query<any>(sql, params);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentShopId: row.parent_shop_id,
      isParentLocation: row.is_parent_location,
      locationType: row.location_type,
      address: row.address,
      phone: row.phone,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    log.error('Failed to get locations', err);
    throw err;
  }
}

/**
 * Get a specific location's hierarchy (parent + children)
 */
export async function getLocationHierarchy(
  shopId: number
): Promise<{ parent?: LocationHierarchy; children: LocationHierarchy[] }> {
  try {
    const locations = await getLocations(shopId);
    if (locations.length === 0) {
      throw new Error(`Location ${shopId} not found`);
    }

    const mainLoc = locations[0];

    // If it has a parent, get the parent and all siblings
    if (mainLoc.parentShopId) {
      const hierarchyLocations = await getLocations(undefined, mainLoc.parentShopId);
      const parent = hierarchyLocations.find((l) => l.id === mainLoc.parentShopId);
      const children = hierarchyLocations.filter((l) => l.id !== parent?.id);
      return { parent, children };
    } else {
      // It's a parent, get all children
      const children = await query<any>(
        'SELECT id, name, slug, parent_shop_id, is_parent_location, location_type, address, phone, email, created_at, updated_at FROM shops WHERE parent_shop_id = $1 ORDER BY name',
        [shopId]
      );
      return {
        parent: mainLoc,
        children: children.rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          parentShopId: row.parent_shop_id,
          isParentLocation: row.is_parent_location,
          locationType: row.location_type,
          address: row.address,
          phone: row.phone,
          email: row.email,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    }
  } catch (err) {
    log.error('Failed to get location hierarchy', err);
    throw err;
  }
}

/**
 * Assign a staff member to a location
 */
export async function assignStaffToLocation(
  userId: number,
  shopId: number,
  options?: {
    primaryLocation?: boolean;
    startDate?: string;
    endDate?: string;
    assignmentType?: 'regular' | 'temporary' | 'contract';
  }
): Promise<StaffLocationAssignment> {
  try {
    const startDate = options?.startDate || new Date().toISOString().split('T')[0];
    const result = await query<any>(
      `
      INSERT INTO staff_location_assignments (user_id, shop_id, primary_location, start_date, end_date, assignment_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, shop_id, start_date) DO UPDATE
      SET end_date = $5, assignment_type = $6, updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, shop_id, primary_location, start_date, end_date, assignment_type, created_at, updated_at
      `,
      [
        userId,
        shopId,
        options?.primaryLocation || false,
        startDate,
        options?.endDate || null,
        options?.assignmentType || 'regular',
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to assign staff to location');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      shopId: row.shop_id,
      primaryLocation: row.primary_location,
      startDate: row.start_date,
      endDate: row.end_date,
      assignmentType: row.assignment_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    log.error('Failed to assign staff to location', err);
    throw err;
  }
}

/**
 * Get all staff members assigned to a location
 */
export async function getLocationStaff(shopId: number): Promise<StaffLocationAssignment[]> {
  try {
    const result = await query<any>(
      `
      SELECT id, user_id, shop_id, primary_location, start_date, end_date, assignment_type, created_at, updated_at
      FROM staff_location_assignments
      WHERE shop_id = $1
      ORDER BY primary_location DESC, start_date DESC
      `,
      [shopId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      shopId: row.shop_id,
      primaryLocation: row.primary_location,
      startDate: row.start_date,
      endDate: row.end_date,
      assignmentType: row.assignment_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    log.error('Failed to get location staff', err);
    throw err;
  }
}

/**
 * Request a cross-location transfer for a staff member
 */
export async function requestCrossLocationTransfer(
  userId: number,
  fromShopId: number,
  toShopId: number,
  options?: {
    transferDate?: string;
    reason?: string;
  }
): Promise<CrossLocationTransfer> {
  try {
    const transferDate = options?.transferDate || new Date().toISOString().split('T')[0];
    const result = await query<any>(
      `
      INSERT INTO cross_location_transfers (user_id, from_shop_id, to_shop_id, transfer_date, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, user_id, from_shop_id, to_shop_id, transfer_date, reason, status, approved_by, created_at, updated_at
      `,
      [userId, fromShopId, toShopId, transferDate, options?.reason || null]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to create transfer request');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      fromShopId: row.from_shop_id,
      toShopId: row.to_shop_id,
      transferDate: row.transfer_date,
      reason: row.reason,
      status: row.status,
      approvedBy: row.approved_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    log.error('Failed to request cross-location transfer', err);
    throw err;
  }
}

/**
 * Get consolidated revenue across all locations
 */
export async function getConsolidatedRevenue(
  parentShopId: number,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  try {
    let sql = `
      SELECT 
        parent_shop_id,
        child_shop_id,
        revenue_date,
        total_revenue,
        appointment_count,
        average_transaction
      FROM consolidated_revenue
      WHERE parent_shop_id = $1
    `;

    const params: any[] = [parentShopId];

    if (startDate) {
      sql += ` AND revenue_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND revenue_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    sql += ' ORDER BY revenue_date DESC, child_shop_id';

    const result = await query<any>(sql, params);
    return result.rows;
  } catch (err) {
    log.error('Failed to get consolidated revenue', err);
    throw err;
  }
}

/**
 * Refresh consolidated revenue calculations for a parent location
 */
export async function refreshConsolidatedRevenue(parentShopId: number): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get all child shops
    const childShops = await query<any>(
      'SELECT id FROM shops WHERE parent_shop_id = $1',
      [parentShopId]
    );

    // For each child shop, calculate revenue for today
    const today = new Date().toISOString().split('T')[0];

    for (const shop of childShops.rows) {
      const revenueData = await query<any>(
        `
        SELECT 
          COUNT(*) as appointment_count,
          COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_revenue,
          COALESCE(AVG(CAST(amount AS DECIMAL)), 0) as average_transaction
        FROM appointments a
        LEFT JOIN payments p ON a.id = p.appointment_id
        WHERE a.shop_id = $1
          AND DATE(a.start_time) = $2
          AND a.status = 'completed'
        `,
        [shop.id, today]
      );

      const row = revenueData.rows[0];

      await client.query(
        `
        INSERT INTO consolidated_revenue (parent_shop_id, child_shop_id, revenue_date, total_revenue, appointment_count, average_transaction)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (child_shop_id, revenue_date) DO UPDATE
        SET total_revenue = $4, appointment_count = $5, average_transaction = $6, updated_at = CURRENT_TIMESTAMP
        `,
        [
          parentShopId,
          shop.id,
          today,
          row.total_revenue,
          row.appointment_count,
          row.average_transaction,
        ]
      );
    }

    await client.query('COMMIT');
    log.info('Consolidated revenue refreshed', { parentShopId });
  } catch (err) {
    await client.query('ROLLBACK');
    log.error('Failed to refresh consolidated revenue', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get location-specific service pricing
 */
export async function getLocationServices(shopId: number): Promise<any[]> {
  try {
    const result = await query<any>(
      `
      SELECT 
        ls.id,
        ls.shop_id,
        ls.service_id,
        bs.name,
        bs.description,
        bs.base_price,
        ls.price_override,
        COALESCE(ls.price_override, bs.base_price) as effective_price,
        bs.duration,
        ls.duration_override,
        COALESCE(ls.duration_override, bs.duration) as effective_duration,
        ls.is_available
      FROM location_services ls
      JOIN barber_services bs ON ls.service_id = bs.id
      WHERE ls.shop_id = $1
      ORDER BY bs.name
      `,
      [shopId]
    );

    return result.rows;
  } catch (err) {
    log.error('Failed to get location services', err);
    throw err;
  }
}

export default {
  createLocation,
  getLocations,
  getLocationHierarchy,
  assignStaffToLocation,
  getLocationStaff,
  requestCrossLocationTransfer,
  getConsolidatedRevenue,
  refreshConsolidatedRevenue,
  getLocationServices,
};
