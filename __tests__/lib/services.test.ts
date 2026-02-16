import ServiceManager, { Service, BarberService } from '@/lib/services'
import * as db from '@/lib/db'

// Mock the database module
jest.mock('@/lib/db', () => ({
  query: jest.fn()
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    createChild: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createChild: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }))
    }))
  }
}))

describe('ServiceManager', () => {
  const mockQuery = db.query as jest.MockedFunction<typeof db.query>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============ GET SHOP SERVICES ============

  describe('getShopServices', () => {
    it('should fetch all active services for a shop', async () => {
      const mockServices: Service[] = [
        {
          id: 1,
          shop_id: 1,
          name: 'Haircut',
          description: 'Standard haircut',
          price: 25,
          duration_minutes: 30,
          category: 'Hair',
          is_active: true,
          created_at: new Date()
        },
        {
          id: 2,
          shop_id: 1,
          name: 'Beard Trim',
          description: 'Beard trimming service',
          price: 15,
          duration_minutes: 20,
          category: 'Beard',
          is_active: true,
          created_at: new Date()
        }
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockServices, rowCount: 2 })

      const result = await ServiceManager.getShopServices(1)

      expect(result).toEqual(mockServices)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1])
      )
    })

    it('should filter services by category', async () => {
      const mockServices: Service[] = [
        {
          id: 1,
          shop_id: 1,
          name: 'Haircut',
          price: 25,
          duration_minutes: 30,
          category: 'Hair',
          is_active: true,
          created_at: new Date()
        }
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockServices, rowCount: 1 })

      const result = await ServiceManager.getShopServices(1, 'Hair')

      expect(result).toEqual(mockServices)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('category'),
        expect.arrayContaining([1, 'Hair'])
      )
    })

    it('should return only active services when activeOnly is true', async () => {
      const mockServices: Service[] = [
        {
          id: 1,
          shop_id: 1,
          name: 'Haircut',
          price: 25,
          duration_minutes: 30,
          category: 'Hair',
          is_active: true,
          created_at: new Date()
        }
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockServices, rowCount: 1 })

      await ServiceManager.getShopServices(1, undefined, true)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.any(Array)
      )
    })

    it('should return all services when activeOnly is false', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await ServiceManager.getShopServices(1, undefined, false)

      const sql = mockQuery.mock.calls[0][0]
      expect(sql).not.toContain('is_active = true')
    })
  })

  // ============ GET BARBER SERVICES ============

  describe('getBarberServices', () => {
    it('should fetch all services for a barber with pricing info', async () => {
      const mockServices = [
        {
          id: 1,
          shop_id: 1,
          name: 'Haircut',
          price: 25,
          duration_minutes: 30,
          category: 'Hair',
          is_active: true,
          created_at: new Date(),
          barber_price: 30,
          barber_duration_minutes: 35,
          is_available: true
        }
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockServices, rowCount: 1 })

      const result = await ServiceManager.getBarberServices(1)

      expect(result).toEqual(mockServices)
      expect(result[0].barber_price).toBe(30)
    })

    it('should handle barber with no services assigned', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await ServiceManager.getBarberServices(999)

      expect(result).toEqual([])
    })
  })

  // ============ GET SINGLE SERVICE ============

  describe('getService', () => {
    it('should fetch a single service by ID and shop ID', async () => {
      const mockService: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [mockService], rowCount: 1 })

      const result = await ServiceManager.getService(1, 1)

      expect(result).toEqual(mockService)
    })

    it('should return null if service not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await ServiceManager.getService(999, 1)

      expect(result).toBeNull()
    })

    it('should verify shop ownership', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await ServiceManager.getService(1, 999)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([1, 999])
      )
    })
  })

  // ============ ADD SERVICE ============

  describe('addService', () => {
    it('should create a new service with all fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check duplicate
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            shop_id: 1,
            name: 'Haircut',
            description: 'Standard haircut',
            price: 25,
            duration_minutes: 30,
            category: 'Hair',
            is_active: true,
            created_at: new Date()
          }
        ],
        rowCount: 1
      })

      const result = await ServiceManager.addService(
        1,
        'Haircut',
        25,
        30,
        'Standard haircut',
        'Hair'
      )

      expect(result.name).toBe('Haircut')
      expect(result.price).toBe(25)
    })

    it('should prevent duplicate service names per shop', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1
      })

      await expect(
        ServiceManager.addService(1, 'Haircut', 25, 30)
      ).rejects.toThrow('already exists')
    })

    it('should handle NULL optional fields', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            shop_id: 1,
            name: 'Simple Service',
            description: null,
            price: 20,
            duration_minutes: 25,
            category: null,
            is_active: true,
            created_at: new Date()
          }
        ],
        rowCount: 1
      })

      const result = await ServiceManager.addService(1, 'Simple Service', 20, 25)

      expect(result.description).toBeNull()
      expect(result.category).toBeNull()
    })
  })

  // ============ UPDATE SERVICE ============

  describe('updateService', () => {
    it('should update service with partial data', async () => {
      const existingService: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [existingService], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...existingService, price: 30 }],
        rowCount: 1
      })

      const result = await ServiceManager.updateService(1, 1, { price: 30 })

      expect(result.price).toBe(30)
    })

    it('should handle 404 for non-existent service', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(
        ServiceManager.updateService(999, 1, { price: 30 })
      ).rejects.toThrow('not found')
    })

    it('should update multiple fields', async () => {
      const existing: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...existing,
            name: 'Premium Haircut',
            price: 35,
            duration_minutes: 45
          }
        ],
        rowCount: 1
      })

      const result = await ServiceManager.updateService(1, 1, {
        name: 'Premium Haircut',
        price: 35,
        duration_minutes: 45
      })

      expect(result.name).toBe('Premium Haircut')
      expect(result.price).toBe(35)
      expect(result.duration_minutes).toBe(45)
    })

    it('should toggle is_active status', async () => {
      const existing: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...existing, is_active: false }],
        rowCount: 1
      })

      const result = await ServiceManager.updateService(1, 1, {
        is_active: false
      })

      expect(result.is_active).toBe(false)
    })
  })

  // ============ DELETE SERVICE ============

  describe('deleteService', () => {
    it('should delete a service', async () => {
      const existing: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await expect(ServiceManager.deleteService(1, 1)).resolves.toBeUndefined()
    })

    it('should handle 404 for non-existent service', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(
        ServiceManager.deleteService(999, 1)
      ).rejects.toThrow('not found')
    })
  })

  // ============ BARBER SERVICE ASSIGNMENT ============

  describe('assignServiceToBarber', () => {
    it('should assign service to barber with default pricing', async () => {
      const service: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [service], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            barber_id: 1,
            service_id: 1,
            price: 25,
            duration_minutes: 30,
            is_available: true,
            created_at: new Date()
          }
        ],
        rowCount: 1
      })

      const result = await ServiceManager.assignServiceToBarber(1, 1, 1)

      expect(result.barber_id).toBe(1)
      expect(result.service_id).toBe(1)
      expect(result.price).toBe(25)
    })

    it('should assign service with custom pricing', async () => {
      const service: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [service], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            barber_id: 1,
            service_id: 1,
            price: 30,
            duration_minutes: 40,
            is_available: true,
            created_at: new Date()
          }
        ],
        rowCount: 1
      })

      const result = await ServiceManager.assignServiceToBarber(1, 1, 1, 30, 40)

      expect(result.price).toBe(30)
      expect(result.duration_minutes).toBe(40)
    })

    it('should prevent duplicate assignments', async () => {
      const service: Service = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        category: 'Hair',
        is_active: true,
        created_at: new Date()
      }

      mockQuery.mockResolvedValueOnce({ rows: [service], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
      mockQuery.mockResolvedValueOnce({
        rows: [{ barber_id: 1, service_id: 1 }],
        rowCount: 1
      })

      await expect(
        ServiceManager.assignServiceToBarber(1, 1, 1)
      ).rejects.toThrow('already assigned')
    })
  })

  // ============ REMOVE SERVICE FROM BARBER ============

  describe('removeServiceFromBarber', () => {
    it('should remove service assignment from barber', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await expect(
        ServiceManager.removeServiceFromBarber(1, 1)
      ).resolves.toBeUndefined()
    })
  })

  // ============ GET SERVICE CATEGORIES ============

  describe('getServiceCategories', () => {
    it('should return list of unique categories for shop', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ category: 'Hair' }, { category: 'Beard' }, { category: 'Other' }],
        rowCount: 3
      })

      const result = await ServiceManager.getServiceCategories(1)

      expect(result).toEqual(['Hair', 'Beard', 'Other'])
    })

    it('should handle shop with no categories', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await ServiceManager.getServiceCategories(1)

      expect(result).toEqual([])
    })
  })
})
