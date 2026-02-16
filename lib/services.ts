import { query } from './db'
import { logger } from './logger'

export interface Service {
  id: number
  shop_id: number
  name: string
  description?: string
  price: number
  duration_minutes: number
  category?: string
  is_active: boolean
  created_at: Date
  updated_at?: Date
}

export interface BarberService {
  barber_id: number
  service_id: number
  price?: number
  duration_minutes?: number
  is_available: boolean
  created_at: Date
  updated_at?: Date
}

export interface ServiceWithBarberInfo extends Service {
  barber_price?: number
  barber_duration_minutes?: number
  is_available?: boolean
}

export class ServiceManager {
  private static logger = logger.createChild('ServiceManager')

  /**
   * Get all services for a shop, optionally filtered by category
   */
  static async getShopServices(shopId: number, category?: string, activeOnly = true): Promise<Service[]> {
    const context = `getShopServices(shopId=${shopId}, category=${category})`
    const log = this.logger.createChild(context)

    try {
      let sql = 'SELECT id, shop_id, name, description, price, duration_minutes, category, is_active, created_at FROM services WHERE shop_id = $1'
      const params: any[] = [shopId]

      if (activeOnly) {
        sql += ' AND is_active = true'
      }

      if (category) {
        sql += ' AND category = $' + (params.length + 1)
        params.push(category)
      }

      sql += ' ORDER BY category, name'

      const result = await query(sql, params)
      log.debug('Retrieved services', { count: result.rows.length })
      return result.rows
    } catch (error) {
      log.error('Error fetching shop services', error)
      throw error
    }
  }

  /**
   * Get all services for a specific barber with pricing information
   */
  static async getBarberServices(barberId: number, activeOnly = true): Promise<ServiceWithBarberInfo[]> {
    const context = `getBarberServices(barberId=${barberId})`
    const log = this.logger.createChild(context)

    try {
      let sql = `
        SELECT 
          s.id,
          s.shop_id,
          s.name,
          s.description,
          s.price as price,
          s.duration_minutes,
          s.category,
          s.is_active,
          s.created_at,
          bs.price as barber_price,
          bs.duration_minutes as barber_duration_minutes,
          bs.is_available
        FROM services s
        LEFT JOIN barber_services bs ON s.id = bs.service_id AND bs.barber_id = $1
        WHERE bs.barber_id = $1
      `
      const params: any[] = [barberId]

      if (activeOnly) {
        sql += ' AND s.is_active = true'
      }

      sql += ' ORDER BY s.category, s.name'

      const result = await query(sql, params)
      log.debug('Retrieved barber services', { count: result.rows.length })
      return result.rows
    } catch (error) {
      log.error('Error fetching barber services', error)
      throw error
    }
  }

  /**
   * Get a single service by ID
   */
  static async getService(serviceId: number, shopId: number): Promise<Service | null> {
    const context = `getService(serviceId=${serviceId}, shopId=${shopId})`
    const log = this.logger.createChild(context)

    try {
      const result = await query(
        'SELECT id, shop_id, name, description, price, duration_minutes, category, is_active, created_at FROM services WHERE id = $1 AND shop_id = $2',
        [serviceId, shopId]
      )

      if (result.rows.length === 0) {
        log.debug('Service not found')
        return null
      }

      log.debug('Retrieved service')
      return result.rows[0]
    } catch (error) {
      log.error('Error fetching service', error)
      throw error
    }
  }

  /**
   * Create a new service
   */
  static async addService(
    shopId: number,
    name: string,
    price: number,
    duration_minutes: number,
    description?: string,
    category?: string
  ): Promise<Service> {
    const context = `addService(shopId=${shopId}, name=${name})`
    const log = this.logger.createChild(context)

    try {
      // Check for duplicate
      const existing = await query(
        'SELECT id FROM services WHERE shop_id = $1 AND LOWER(name) = LOWER($2)',
        [shopId, name]
      )

      if (existing.rows.length > 0) {
        log.warn('Service already exists')
        throw new Error(`Service "${name}" already exists for this shop`)
      }

      const result = await query(
        `INSERT INTO services (shop_id, name, description, price, duration_minutes, category, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
         RETURNING id, shop_id, name, description, price, duration_minutes, category, is_active, created_at`,
        [shopId, name, description || null, price, duration_minutes, category || null]
      )

      log.info('Service created', { serviceId: result.rows[0].id })
      return result.rows[0]
    } catch (error) {
      log.error('Error creating service', error)
      throw error
    }
  }

  /**
   * Update an existing service
   */
  static async updateService(
    serviceId: number,
    shopId: number,
    updates: {
      name?: string
      description?: string
      price?: number
      duration_minutes?: number
      category?: string
      is_active?: boolean
    }
  ): Promise<Service> {
    const context = `updateService(serviceId=${serviceId}, shopId=${shopId})`
    const log = this.logger.createChild(context)

    try {
      // Verify service exists
      const existing = await this.getService(serviceId, shopId)
      if (!existing) {
        log.warn('Service not found')
        throw new Error('Service not found')
      }

      // Build dynamic update query
      const setClauses: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex}`)
        params.push(updates.name)
        paramIndex++
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex}`)
        params.push(updates.description)
        paramIndex++
      }
      if (updates.price !== undefined) {
        setClauses.push(`price = $${paramIndex}`)
        params.push(updates.price)
        paramIndex++
      }
      if (updates.duration_minutes !== undefined) {
        setClauses.push(`duration_minutes = $${paramIndex}`)
        params.push(updates.duration_minutes)
        paramIndex++
      }
      if (updates.category !== undefined) {
        setClauses.push(`category = $${paramIndex}`)
        params.push(updates.category)
        paramIndex++
      }
      if (updates.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex}`)
        params.push(updates.is_active)
        paramIndex++
      }

      if (setClauses.length === 0) {
        log.debug('No updates provided')
        return existing
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
      params.push(serviceId, shopId)

      const sql = `UPDATE services SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND shop_id = $${paramIndex + 1} RETURNING id, shop_id, name, description, price, duration_minutes, category, is_active, created_at, updated_at`

      const result = await query(sql, params)

      log.info('Service updated', { serviceId })
      return result.rows[0]
    } catch (error) {
      log.error('Error updating service', error)
      throw error
    }
  }

  /**
   * Delete a service
   */
  static async deleteService(serviceId: number, shopId: number): Promise<void> {
    const context = `deleteService(serviceId=${serviceId}, shopId=${shopId})`
    const log = this.logger.createChild(context)

    try {
      // Verify service exists
      const existing = await this.getService(serviceId, shopId)
      if (!existing) {
        log.warn('Service not found')
        throw new Error('Service not found')
      }

      await query('DELETE FROM services WHERE id = $1 AND shop_id = $2', [serviceId, shopId])

      log.info('Service deleted', { serviceId })
    } catch (error) {
      log.error('Error deleting service', error)
      throw error
    }
  }

  /**
   * Assign a service to a barber with optional custom pricing
   */
  static async assignServiceToBarber(
    barberId: number,
    serviceId: number,
    shopId: number,
    customPrice?: number,
    customDuration?: number
  ): Promise<BarberService> {
    const context = `assignServiceToBarber(barberId=${barberId}, serviceId=${serviceId})`
    const log = this.logger.createChild(context)

    try {
      // Verify service exists and belongs to shop
      const service = await this.getService(serviceId, shopId)
      if (!service) {
        log.warn('Service not found')
        throw new Error('Service not found')
      }

      // Verify barber exists and belongs to shop
      const barberResult = await query(
        'SELECT id FROM users WHERE id = $1 AND shop_id = $2 AND role = $3',
        [barberId, shopId, 'barber']
      )
      if (barberResult.rows.length === 0) {
        log.warn('Barber not found')
        throw new Error('Barber not found')
      }

      // Check if already assigned
      const existing = await query(
        'SELECT * FROM barber_services WHERE barber_id = $1 AND service_id = $2',
        [barberId, serviceId]
      )

      if (existing.rows.length > 0) {
        log.warn('Service already assigned to barber')
        throw new Error('Service already assigned to barber')
      }

      // Use provided or default values
      const price = customPrice ?? service.price
      const duration = customDuration ?? service.duration_minutes

      const result = await query(
        `INSERT INTO barber_services (barber_id, service_id, price, duration_minutes, is_available, created_at)
         VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
         RETURNING barber_id, service_id, price, duration_minutes, is_available, created_at`,
        [barberId, serviceId, price, duration]
      )

      log.info('Service assigned to barber', { barberId, serviceId })
      return result.rows[0]
    } catch (error) {
      log.error('Error assigning service to barber', error)
      throw error
    }
  }

  /**
   * Remove a service from a barber
   */
  static async removeServiceFromBarber(barberId: number, serviceId: number): Promise<void> {
    const context = `removeServiceFromBarber(barberId=${barberId}, serviceId=${serviceId})`
    const log = this.logger.createChild(context)

    try {
      await query('DELETE FROM barber_services WHERE barber_id = $1 AND service_id = $2', [barberId, serviceId])
      log.info('Service removed from barber', { barberId, serviceId })
    } catch (error) {
      log.error('Error removing service from barber', error)
      throw error
    }
  }

  /**
   * Update barber-specific service pricing/availability
   */
  static async updateBarberService(
    barberId: number,
    serviceId: number,
    updates: {
      price?: number
      duration_minutes?: number
      is_available?: boolean
    }
  ): Promise<BarberService> {
    const context = `updateBarberService(barberId=${barberId}, serviceId=${serviceId})`
    const log = this.logger.createChild(context)

    try {
      // Verify exists
      const existing = await query(
        'SELECT * FROM barber_services WHERE barber_id = $1 AND service_id = $2',
        [barberId, serviceId]
      )

      if (existing.rows.length === 0) {
        log.warn('Barber service assignment not found')
        throw new Error('Service not assigned to this barber')
      }

      const setClauses: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (updates.price !== undefined) {
        setClauses.push(`price = $${paramIndex}`)
        params.push(updates.price)
        paramIndex++
      }
      if (updates.duration_minutes !== undefined) {
        setClauses.push(`duration_minutes = $${paramIndex}`)
        params.push(updates.duration_minutes)
        paramIndex++
      }
      if (updates.is_available !== undefined) {
        setClauses.push(`is_available = $${paramIndex}`)
        params.push(updates.is_available)
        paramIndex++
      }

      if (setClauses.length === 0) {
        log.debug('No updates provided')
        return existing.rows[0]
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
      params.push(barberId, serviceId)

      const sql = `UPDATE barber_services SET ${setClauses.join(', ')} WHERE barber_id = $${paramIndex} AND service_id = $${paramIndex + 1} RETURNING barber_id, service_id, price, duration_minutes, is_available, created_at, updated_at`

      const result = await query(sql, params)

      log.info('Barber service updated', { barberId, serviceId })
      return result.rows[0]
    } catch (error) {
      log.error('Error updating barber service', error)
      throw error
    }
  }

  /**
   * Get categories available in a shop
   */
  static async getServiceCategories(shopId: number): Promise<string[]> {
    const context = `getServiceCategories(shopId=${shopId})`
    const log = this.logger.createChild(context)

    try {
      const result = await query(
        `SELECT DISTINCT category FROM services WHERE shop_id = $1 AND category IS NOT NULL AND is_active = true ORDER BY category`,
        [shopId]
      )
      const categories = result.rows.map((row) => row.category)
      log.debug('Retrieved categories', { count: categories.length })
      return categories
    } catch (error) {
      log.error('Error fetching categories', error)
      throw error
    }
  }
}

export default ServiceManager
