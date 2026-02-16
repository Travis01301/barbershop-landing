import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { GET as servicesGet, POST as servicesPost } from '@/app/api/services/route'
import { GET as serviceDetailGet, PUT as serviceDetailPut, DELETE as serviceDetailDelete } from '@/app/api/services/[id]/route'
import ServiceManager from '@/lib/services'

// Mock the services manager
jest.mock('@/lib/services', () => ({
  __esModule: true,
  default: {
    getShopServices: jest.fn(),
    addService: jest.fn(),
    getService: jest.fn(),
    updateService: jest.fn(),
    deleteService: jest.fn()
  }
}))

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
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

describe('Services API Endpoints', () => {
  const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>
  const mockServiceManager = ServiceManager as jest.Mocked<typeof ServiceManager>

  beforeEach(() => {
    jest.clearAllMocks()
    mockJwtVerify.mockReturnValue({ shopId: 1 } as any)
  })

  // ============ GET /api/services ============

  describe('GET /api/services', () => {
    it('should return 401 without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/services')
      const response = await servicesGet(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should fetch and return services for shop', async () => {
      const mockServices = [
        {
          id: 1,
          shop_id: 1,
          name: 'Haircut',
          price: 25,
          duration_minutes: 30,
          is_active: true
        }
      ]

      mockServiceManager.getShopServices.mockResolvedValueOnce(mockServices as any)

      const request = new NextRequest('http://localhost:3000/api/services', {
        headers: { Authorization: 'Bearer test-token' }
      })

      const response = await servicesGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.services).toEqual(mockServices)
    })

    it('should filter by category if provided', async () => {
      mockServiceManager.getShopServices.mockResolvedValueOnce([])

      const request = new NextRequest(
        'http://localhost:3000/api/services?category=Hair',
        { headers: { Authorization: 'Bearer test-token' } }
      )

      await servicesGet(request)

      expect(mockServiceManager.getShopServices).toHaveBeenCalledWith(1, 'Hair', true)
    })

    it('should handle errors gracefully', async () => {
      mockServiceManager.getShopServices.mockRejectedValueOnce(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/services', {
        headers: { Authorization: 'Bearer test-token' }
      })

      const response = await servicesGet(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  // ============ POST /api/services ============

  describe('POST /api/services', () => {
    it('should create a new service', async () => {
      const newService = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        is_active: true
      }

      mockServiceManager.addService.mockResolvedValueOnce(newService as any)

      const request = new NextRequest('http://localhost:3000/api/services', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: JSON.stringify({
          name: 'Haircut',
          base_price: 25,
          duration_minutes: 30,
          description: 'Standard haircut'
        })
      })

      const response = await servicesPost(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.service.name).toBe('Haircut')
    })

    it('should return 409 if service already exists', async () => {
      mockServiceManager.addService.mockRejectedValueOnce(
        new Error('already exists')
      )

      const request = new NextRequest('http://localhost:3000/api/services', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: JSON.stringify({
          name: 'Haircut',
          base_price: 25,
          duration_minutes: 30
        })
      })

      const response = await servicesPost(request)
      const data = await response.json()

      expect(response.status).toBe(409)
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/services', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: JSON.stringify({
          name: '', // Missing name
          base_price: 25,
          duration_minutes: 30
        })
      })

      const response = await servicesPost(request)

      expect(response.status).toBe(400)
    })
  })

  // ============ GET /api/services/:id ============

  describe('GET /api/services/[id]', () => {
    it('should fetch a service by ID', async () => {
      const mockService = {
        id: 1,
        shop_id: 1,
        name: 'Haircut',
        price: 25,
        duration_minutes: 30,
        is_active: true
      }

      mockServiceManager.getService.mockResolvedValueOnce(mockService as any)

      const request = new NextRequest(
        'http://localhost:3000/api/services/1',
        { headers: { Authorization: 'Bearer test-token' } }
      )

      const response = await serviceDetailGet(request, {
        params: { id: '1' }
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.service.id).toBe(1)
    })

    it('should return 404 if service not found', async () => {
      mockServiceManager.getService.mockResolvedValueOnce(null)

      const request = new NextRequest(
        'http://localhost:3000/api/services/999',
        { headers: { Authorization: 'Bearer test-token' } }
      )

      const response = await serviceDetailGet(request, {
        params: { id: '999' }
      })

      expect(response.status).toBe(404)
    })
  })

  // ============ PUT /api/services/:id ============

  describe('PUT /api/services/[id]', () => {
    it('should update a service', async () => {
      const updatedService = {
        id: 1,
        shop_id: 1,
        name: 'Premium Haircut',
        price: 35,
        duration_minutes: 45,
        is_active: true
      }

      mockServiceManager.updateService.mockResolvedValueOnce(updatedService as any)

      const request = new NextRequest(
        'http://localhost:3000/api/services/1',
        {
          method: 'PUT',
          headers: { Authorization: 'Bearer test-token' },
          body: JSON.stringify({
            name: 'Premium Haircut',
            price: 35,
            duration_minutes: 45
          })
        }
      )

      const response = await serviceDetailPut(request, {
        params: { id: '1' }
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.service.price).toBe(35)
    })

    it('should return 404 if service not found', async () => {
      mockServiceManager.updateService.mockRejectedValueOnce(
        new Error('not found')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/services/999',
        {
          method: 'PUT',
          headers: { Authorization: 'Bearer test-token' },
          body: JSON.stringify({ price: 30 })
        }
      )

      const response = await serviceDetailPut(request, {
        params: { id: '999' }
      })

      expect(response.status).toBe(404)
    })
  })

  // ============ DELETE /api/services/:id ============

  describe('DELETE /api/services/[id]', () => {
    it('should delete a service', async () => {
      mockServiceManager.deleteService.mockResolvedValueOnce(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/services/1',
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer test-token' }
        }
      )

      const response = await serviceDetailDelete(request, {
        params: { id: '1' }
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 if service not found', async () => {
      mockServiceManager.deleteService.mockRejectedValueOnce(
        new Error('not found')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/services/999',
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer test-token' }
        }
      )

      const response = await serviceDetailDelete(request, {
        params: { id: '999' }
      })

      expect(response.status).toBe(404)
    })
  })
})
