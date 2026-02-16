import { groupBookingService } from './group-booking-service'
import { query } from './db'

// Mock dependencies
jest.mock('./db')
jest.mock('./logger', () => ({
  logger: {
    createChild: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}))

jest.mock('./sms-service', () => ({
  smsService: {
    send: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock('./email-service', () => ({
  emailService: {
    sendGroupInvite: jest.fn().mockResolvedValue({ success: true }),
  },
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('GroupBookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Group Creation', () => {
    it('should create a group booking successfully', async () => {
      const mockGroup = {
        id: 'group-1',
        shopId: 'shop-1',
        organizerCustomerId: 'customer-1',
        groupName: 'Bachelor Party',
        groupSize: 5,
        totalCost: 0,
        subtotalCost: 0,
        discountPercent: 0,
        discountAmount: 0,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery.mockResolvedValueOnce({
        rows: [mockGroup],
        rowCount: 1,
      })

      const result = await groupBookingService.createGroupBooking(
        'shop-1',
        'customer-1',
        'Bachelor Party',
        5
      )

      expect(result).toEqual(mockGroup)
      expect(mockQuery).toHaveBeenCalled()
    })

    it('should validate group size constraints', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      await expect(
        groupBookingService.createGroupBooking('shop-1', 'customer-1', 'Small Group', 1)
      ).rejects.toThrow()
    })
  })

  describe('Group Member Management', () => {
    it('should add member to group', async () => {
      const mockGroup = {
        id: 'group-1',
        shopId: 'shop-1',
        organizerCustomerId: 'customer-1',
        groupName: 'Bachelor Party',
        groupSize: 5,
        totalCost: 0,
        subtotalCost: 0,
        discountPercent: 0,
        discountAmount: 0,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockMember = {
        id: 'member-1',
        groupBookingId: 'group-1',
        customerId: 'customer-2',
        barberId: undefined,
        appointmentId: undefined,
        guestName: undefined,
        guestEmail: undefined,
        guestPhone: undefined,
        slotTime: new Date('2025-03-15T10:00:00Z'),
        serviceType: 'Haircut',
        servicePrice: 25,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [mockGroup], rowCount: 1 }) // Get group
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }) // Count existing members
        .mockResolvedValueOnce({ rows: [mockMember], rowCount: 1 }) // Add member
        .mockResolvedValueOnce({ rows: [{ total_price: 25, count: 1 }], rowCount: 1 }) // Recalculate
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get discount

      const result = await groupBookingService.addGroupMember(
        'group-1',
        new Date('2025-03-15T10:00:00Z'),
        25,
        { customerId: 'customer-2', serviceType: 'Haircut' }
      )

      expect(result).toEqual(mockMember)
    })

    it('should prevent adding member when group at capacity', async () => {
      const mockGroup = {
        id: 'group-1',
        shopId: 'shop-1',
        organizerCustomerId: 'customer-1',
        groupName: 'Bachelor Party',
        groupSize: 2,
        totalCost: 0,
        subtotalCost: 0,
        discountPercent: 0,
        discountAmount: 0,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [mockGroup], rowCount: 1 }) // Get group
        .mockResolvedValueOnce({ rows: [{ count: 2 }], rowCount: 1 }) // Count existing members

      await expect(
        groupBookingService.addGroupMember(
          'group-1',
          new Date(),
          25,
          { customerId: 'customer-2' }
        )
      ).rejects.toThrow('Group is at capacity')
    })

    it('should remove member from group', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({
        rows: [{ total_price: 0, count: 0 }],
        rowCount: 1,
      })

      await groupBookingService.removeGroupMember('group-1', 'member-1')

      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('Discount Calculation', () => {
    it('should apply discount for 4+ people', async () => {
      const mockDiscount = {
        id: 'discount-1',
        shopId: 'shop-1',
        minGroupSize: 4,
        discountPercent: 10,
        description: '4+ people discount',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery.mockResolvedValueOnce({
        rows: [mockDiscount],
        rowCount: 1,
      })

      const result = await groupBookingService.getApplicableDiscount('shop-1', 4)

      expect(result).toEqual(mockDiscount)
      expect(result?.discountPercent).toBe(10)
    })

    it('should apply highest discount for group size', async () => {
      const mockDiscounts = [
        {
          id: 'discount-1',
          shopId: 'shop-1',
          minGroupSize: 10,
          discountPercent: 20,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockQuery.mockResolvedValueOnce({
        rows: mockDiscounts,
        rowCount: 1,
      })

      const result = await groupBookingService.getApplicableDiscount('shop-1', 15)

      expect(result?.discountPercent).toBe(20)
    })

    it('should recalculate group costs with discount', async () => {
      const mockGroup = {
        id: 'group-1',
        shopId: 'shop-1',
        organizerCustomerId: 'customer-1',
        groupName: 'Party',
        groupSize: 5,
        totalCost: 112.5,
        subtotalCost: 125,
        discountPercent: 10,
        discountAmount: 12.5,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [mockGroup], rowCount: 1 }) // Get group
        .mockResolvedValueOnce({ rows: [{ total_price: 125, count: 5 }], rowCount: 1 }) // Get members
        .mockResolvedValueOnce({
          rows: [
            { minGroupSize: 4, discountPercent: 10 },
          ],
          rowCount: 1,
        }) // Get discount
        .mockResolvedValueOnce({ rowCount: 1 }) // Update group

      await groupBookingService.recalculateGroupCosts('group-1')

      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('Barber Assignment', () => {
    it('should assign barber to member', async () => {
      const mockMember = {
        id: 'member-1',
        groupBookingId: 'group-1',
        customerId: 'customer-2',
        barberId: 'barber-1',
        appointmentId: undefined,
        guestName: undefined,
        guestEmail: undefined,
        guestPhone: undefined,
        slotTime: new Date('2025-03-15T10:00:00Z'),
        serviceType: 'Haircut',
        servicePrice: 25,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check conflicts
        .mockResolvedValueOnce({ rows: [mockMember], rowCount: 1 }) // Update member

      const result = await groupBookingService.assignBarberToMember(
        'group-1',
        'member-1',
        'barber-1',
        new Date('2025-03-15T10:00:00Z')
      )

      expect(result.barberId).toBe('barber-1')
    })

    it('should prevent double-booking barber', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 1 }],
        rowCount: 1,
      }) // Conflict found

      await expect(
        groupBookingService.assignBarberToMember(
          'group-1',
          'member-1',
          'barber-1',
          new Date()
        )
      ).rejects.toThrow('Barber is not available')
    })
  })

  describe('Group Confirmation', () => {
    it('should confirm all group members and create appointments', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          groupBookingId: 'group-1',
          customerId: 'customer-2',
          barberId: 'barber-1',
          appointmentId: undefined,
          guestName: undefined,
          guestEmail: undefined,
          guestPhone: undefined,
          slotTime: new Date('2025-03-15T10:00:00Z'),
          serviceType: 'Haircut',
          servicePrice: 25,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const mockGroup = {
        id: 'group-1',
        shopId: 'shop-1',
        organizerCustomerId: 'customer-1',
        groupName: 'Party',
        groupSize: 5,
        totalCost: 112.5,
        subtotalCost: 125,
        discountPercent: 10,
        discountAmount: 12.5,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery
        .mockResolvedValueOnce({ rows: [mockGroup], rowCount: 1 }) // Get group
        .mockResolvedValueOnce({
          rows: mockMembers,
          rowCount: 1,
        }) // Get members
        .mockResolvedValueOnce({ rows: [{ id: 'apt-1' }], rowCount: 1 }) // Create appointment
        .mockResolvedValueOnce({ rowCount: 1 }) // Update member
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }) // Count confirmed
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }) // Count active
        .mockResolvedValueOnce({ rowCount: 1 }) // Update group status

      await groupBookingService.confirmGroupMembers('group-1')

      expect(mockQuery).toHaveBeenCalled()
    })
  })

  describe('Group Cancellation', () => {
    it('should cancel entire group booking', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 5 }) // Cancel members
        .mockResolvedValueOnce({ rowCount: 1 }) // Cancel group
        .mockResolvedValueOnce({ rowCount: 5 }) // Cancel appointments

      await groupBookingService.cancelGroupBooking('group-1', 'Customer requested cancellation')

      expect(mockQuery).toHaveBeenCalledTimes(3)
    })
  })

  describe('Available Slots', () => {
    it('should return available slots for barbers', async () => {
      const mockBarbers = [
        { id: 'barber-1' },
        { id: 'barber-2' },
      ]

      const mockBookings = [
        {
          start_time: new Date('2025-03-15T10:00:00Z'),
          end_time: new Date('2025-03-15T10:30:00Z'),
        },
      ]

      mockQuery
        .mockResolvedValueOnce({
          rows: mockBarbers,
          rowCount: 2,
        }) // Get barbers
        .mockResolvedValueOnce({
          rows: mockBookings,
          rowCount: 1,
        }) // Get bookings for barber 1
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        }) // Get bookings for barber 2

      const result = await groupBookingService.getAvailableSlots(
        'shop-1',
        new Date('2025-03-15T08:00:00Z'),
        new Date('2025-03-15T18:00:00Z'),
        undefined,
        30
      )

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBeGreaterThan(0)
    })
  })

  describe('Discount Rule Management', () => {
    it('should set discount rule for shop', async () => {
      const mockDiscount = {
        id: 'discount-1',
        shopId: 'shop-1',
        minGroupSize: 6,
        discountPercent: 15,
        description: '6+ people',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockQuery.mockResolvedValueOnce({
        rows: [mockDiscount],
        rowCount: 1,
      })

      const result = await groupBookingService.setDiscountRule(
        'shop-1',
        6,
        15,
        '6+ people'
      )

      expect(result.minGroupSize).toBe(6)
      expect(result.discountPercent).toBe(15)
    })

    it('should get all discount rules for shop', async () => {
      const mockDiscounts = [
        {
          id: 'discount-1',
          shopId: 'shop-1',
          minGroupSize: 4,
          discountPercent: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'discount-2',
          shopId: 'shop-1',
          minGroupSize: 6,
          discountPercent: 15,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockQuery.mockResolvedValueOnce({
        rows: mockDiscounts,
        rowCount: 2,
      })

      const result = await groupBookingService.getDiscountRules('shop-1')

      expect(result.length).toBe(2)
      expect(result[0].minGroupSize).toBe(4)
    })
  })

  describe('Customer Groups', () => {
    it('should get customer groups', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          shopId: 'shop-1',
          organizerCustomerId: 'customer-1',
          groupName: 'Party 1',
          groupSize: 5,
          totalCost: 112.5,
          subtotalCost: 125,
          discountPercent: 10,
          discountAmount: 12.5,
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'group-2',
          shopId: 'shop-1',
          organizerCustomerId: 'customer-1',
          groupName: 'Party 2',
          groupSize: 3,
          totalCost: 75,
          subtotalCost: 75,
          discountPercent: 0,
          discountAmount: 0,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockQuery.mockResolvedValueOnce({
        rows: mockGroups,
        rowCount: 2,
      })

      const result = await groupBookingService.getCustomerGroups('customer-1')

      expect(result.length).toBe(2)
      expect(result[0].groupName).toBe('Party 1')
    })
  })
})
