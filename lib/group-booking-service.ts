import { logger } from './logger'
import { query } from './db'
import { smsService } from './sms-service'
import { emailService } from './email-service'

const gbLogger = logger.createChild('group-booking-service')

export interface GroupBooking {
  id: string
  shopId: string
  organizerCustomerId: string
  groupName: string
  groupSize: number
  totalCost: number
  subtotalCost: number
  discountPercent: number
  discountAmount: number
  status: 'pending' | 'partial-confirmed' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface GroupBookingMember {
  id: string
  groupBookingId: string
  customerId?: string
  barberId?: string
  appointmentId?: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  slotTime: Date
  serviceType?: string
  servicePrice: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'no-show' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface GroupDiscount {
  id: string
  shopId: string
  minGroupSize: number
  discountPercent: number
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Group Booking Service
 * Handles creation, management, and confirmation of group bookings
 */
class GroupBookingService {
  /**
   * Create a new group booking
   */
  async createGroupBooking(
    shopId: string,
    organizerCustomerId: string,
    groupName: string,
    groupSize: number,
    notes?: string
  ): Promise<GroupBooking> {
    gbLogger.info('Creating group booking', {
      shopId,
      organizerCustomerId,
      groupName,
      groupSize,
    })

    try {
      const result = await query<GroupBooking>(
        `INSERT INTO group_bookings 
         (shop_id, organizer_customer_id, group_name, group_size, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING *`,
        [shopId, organizerCustomerId, groupName, groupSize, notes || null]
      )

      if (result.rows.length === 0) {
        throw new Error('Failed to create group booking')
      }

      gbLogger.info('Group booking created successfully', {
        groupBookingId: result.rows[0].id,
      })

      return result.rows[0]
    } catch (error) {
      gbLogger.error('Error creating group booking', error)
      throw error
    }
  }

  /**
   * Get group booking by ID
   */
  async getGroupBooking(groupBookingId: string): Promise<GroupBooking | null> {
    try {
      const result = await query<GroupBooking>(
        'SELECT * FROM group_bookings WHERE id = $1',
        [groupBookingId]
      )
      return result.rows[0] || null
    } catch (error) {
      gbLogger.error('Error fetching group booking', error, { groupBookingId })
      return null
    }
  }

  /**
   * Get group booking with members
   */
  async getGroupBookingWithMembers(
    groupBookingId: string
  ): Promise<{
    booking: GroupBooking | null
    members: GroupBookingMember[]
  }> {
    try {
      const booking = await this.getGroupBooking(groupBookingId)
      const membersResult = await query<GroupBookingMember>(
        'SELECT * FROM group_booking_members WHERE group_booking_id = $1 ORDER BY slot_time ASC',
        [groupBookingId]
      )

      return {
        booking,
        members: membersResult.rows,
      }
    } catch (error) {
      gbLogger.error('Error fetching group booking with members', error, {
        groupBookingId,
      })
      return { booking: null, members: [] }
    }
  }

  /**
   * Get customer's groups
   */
  async getCustomerGroups(customerId: string): Promise<GroupBooking[]> {
    try {
      const result = await query<GroupBooking>(
        'SELECT * FROM group_bookings WHERE organizer_customer_id = $1 ORDER BY created_at DESC',
        [customerId]
      )
      return result.rows
    } catch (error) {
      gbLogger.error('Error fetching customer groups', error, { customerId })
      return []
    }
  }

  /**
   * Add member to group booking
   */
  async addGroupMember(
    groupBookingId: string,
    slotTime: Date,
    servicePrice: number,
    options: {
      customerId?: string
      barberId?: string
      guestName?: string
      guestEmail?: string
      guestPhone?: string
      serviceType?: string
    } = {}
  ): Promise<GroupBookingMember> {
    gbLogger.info('Adding member to group', {
      groupBookingId,
      slotTime,
      servicePrice,
      ...options,
    })

    try {
      // Validate group exists and has space
      const booking = await this.getGroupBooking(groupBookingId)
      if (!booking) {
        throw new Error('Group booking not found')
      }

      const membersResult = await query<{ count: number }>(
        'SELECT COUNT(*) as count FROM group_booking_members WHERE group_booking_id = $1 AND status != $2',
        [groupBookingId, 'cancelled']
      )

      const currentMembers = membersResult.rows[0]?.count || 0
      if (currentMembers >= booking.groupSize) {
        throw new Error('Group is at capacity')
      }

      // Add member
      const result = await query<GroupBookingMember>(
        `INSERT INTO group_booking_members 
         (group_booking_id, customer_id, barber_id, guest_name, guest_email, guest_phone, 
          slot_time, service_type, service_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
         RETURNING *`,
        [
          groupBookingId,
          options.customerId || null,
          options.barberId || null,
          options.guestName || null,
          options.guestEmail || null,
          options.guestPhone || null,
          slotTime,
          options.serviceType || null,
          servicePrice,
        ]
      )

      if (result.rows.length === 0) {
        throw new Error('Failed to add member')
      }

      // Update group subtotal and recalculate discount
      await this.recalculateGroupCosts(groupBookingId)

      gbLogger.info('Member added successfully', {
        groupBookingId,
        memberId: result.rows[0].id,
      })

      return result.rows[0]
    } catch (error) {
      gbLogger.error('Error adding group member', error)
      throw error
    }
  }

  /**
   * Remove member from group
   */
  async removeGroupMember(groupBookingId: string, memberId: string): Promise<void> {
    gbLogger.info('Removing member from group', { groupBookingId, memberId })

    try {
      await query(
        `UPDATE group_booking_members 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND group_booking_id = $2`,
        [memberId, groupBookingId]
      )

      // Recalculate costs
      await this.recalculateGroupCosts(groupBookingId)

      gbLogger.info('Member removed successfully', { groupBookingId, memberId })
    } catch (error) {
      gbLogger.error('Error removing group member', error)
      throw error
    }
  }

  /**
   * Assign barber to group member
   */
  async assignBarberToMember(
    groupBookingId: string,
    memberId: string,
    barberId: string,
    slotTime: Date
  ): Promise<GroupBookingMember> {
    gbLogger.info('Assigning barber to member', {
      groupBookingId,
      memberId,
      barberId,
      slotTime,
    })

    try {
      // Check for conflicts
      const conflicts = await this.checkBarberConflicts(barberId, slotTime)
      if (conflicts) {
        throw new Error('Barber is not available at this time')
      }

      // Update member
      const result = await query<GroupBookingMember>(
        `UPDATE group_booking_members 
         SET barber_id = $1, slot_time = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND group_booking_id = $4
         RETURNING *`,
        [barberId, slotTime, memberId, groupBookingId]
      )

      if (result.rows.length === 0) {
        throw new Error('Member not found')
      }

      gbLogger.info('Barber assigned successfully', {
        groupBookingId,
        memberId,
        barberId,
      })

      return result.rows[0]
    } catch (error) {
      gbLogger.error('Error assigning barber', error)
      throw error
    }
  }

  /**
   * Check if barber has conflicts at given time
   */
  private async checkBarberConflicts(
    barberId: string,
    slotTime: Date,
    excludeGroupMemberId?: string
  ): Promise<boolean> {
    try {
      const result = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM group_booking_members gbm
         WHERE gbm.barber_id = $1 
         AND gbm.slot_time = $2
         AND gbm.status IN ('confirmed', 'completed')
         ${excludeGroupMemberId ? 'AND gbm.id != $3' : ''}`,
        excludeGroupMemberId ? [barberId, slotTime, excludeGroupMemberId] : [barberId, slotTime]
      )

      return (result.rows[0]?.count || 0) > 0
    } catch (error) {
      gbLogger.error('Error checking barber conflicts', error)
      return false
    }
  }

  /**
   * Recalculate group costs based on members and discount tier
   */
  async recalculateGroupCosts(groupBookingId: string): Promise<void> {
    gbLogger.debug('Recalculating group costs', { groupBookingId })

    try {
      const booking = await this.getGroupBooking(groupBookingId)
      if (!booking) throw new Error('Booking not found')

      // Get all active members
      const memberResult = await query<{ total_price: number; count: number }>(
        `SELECT 
          SUM(service_price) as total_price,
          COUNT(*) as count
         FROM group_booking_members 
         WHERE group_booking_id = $1 AND status IN ('pending', 'confirmed')`,
        [groupBookingId]
      )

      const subtotal = parseFloat(memberResult.rows[0]?.total_price || 0)
      const memberCount = memberResult.rows[0]?.count || 0

      // Get applicable discount
      const discountRule = await this.getApplicableDiscount(booking.shopId, memberCount)
      const discountPercent = discountRule?.discountPercent || 0
      const discountAmount = (subtotal * discountPercent) / 100

      const totalCost = subtotal - discountAmount

      // Update group booking
      await query(
        `UPDATE group_bookings 
         SET subtotal_cost = $1, discount_percent = $2, discount_amount = $3, 
             total_cost = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [subtotal, discountPercent, discountAmount, totalCost, groupBookingId]
      )

      gbLogger.debug('Group costs recalculated', {
        groupBookingId,
        subtotal,
        memberCount,
        discountPercent,
        totalCost,
      })
    } catch (error) {
      gbLogger.error('Error recalculating group costs', error)
    }
  }

  /**
   * Get applicable discount based on group size
   */
  async getApplicableDiscount(
    shopId: string,
    groupSize: number
  ): Promise<GroupDiscount | null> {
    try {
      const result = await query<GroupDiscount>(
        `SELECT * FROM group_booking_discounts 
         WHERE shop_id = $1 AND min_group_size <= $2 AND is_active = true
         ORDER BY min_group_size DESC
         LIMIT 1`,
        [shopId, groupSize]
      )

      return result.rows[0] || null
    } catch (error) {
      gbLogger.error('Error getting discount', error)
      return null
    }
  }

  /**
   * Set discount rules for a shop
   */
  async setDiscountRule(
    shopId: string,
    minGroupSize: number,
    discountPercent: number,
    description?: string
  ): Promise<GroupDiscount> {
    gbLogger.info('Setting discount rule', {
      shopId,
      minGroupSize,
      discountPercent,
    })

    try {
      const result = await query<GroupDiscount>(
        `INSERT INTO group_booking_discounts 
         (shop_id, min_group_size, discount_percent, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (shop_id, min_group_size) 
         DO UPDATE SET discount_percent = $3, description = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [shopId, minGroupSize, discountPercent, description || null]
      )

      if (result.rows.length === 0) {
        throw new Error('Failed to set discount rule')
      }

      gbLogger.info('Discount rule set successfully', { shopId, minGroupSize })
      return result.rows[0]
    } catch (error) {
      gbLogger.error('Error setting discount rule', error)
      throw error
    }
  }

  /**
   * Get discount rules for a shop
   */
  async getDiscountRules(shopId: string): Promise<GroupDiscount[]> {
    try {
      const result = await query<GroupDiscount>(
        `SELECT * FROM group_booking_discounts 
         WHERE shop_id = $1 AND is_active = true
         ORDER BY min_group_size ASC`,
        [shopId]
      )
      return result.rows
    } catch (error) {
      gbLogger.error('Error fetching discount rules', error)
      return []
    }
  }

  /**
   * Confirm group members (create appointments)
   */
  async confirmGroupMembers(groupBookingId: string, memberIds?: string[]): Promise<void> {
    gbLogger.info('Confirming group members', { groupBookingId, memberIds })

    try {
      const booking = await this.getGroupBooking(groupBookingId)
      if (!booking) throw new Error('Booking not found')

      // Get members to confirm
      let membersToConfirm = await query<GroupBookingMember>(
        `SELECT * FROM group_booking_members 
         WHERE group_booking_id = $1 AND status = 'pending'
         ${memberIds ? `AND id = ANY($2::uuid[])` : ''}`,
        memberIds ? [groupBookingId, memberIds] : [groupBookingId]
      )

      // Create appointments and update member status
      for (const member of membersToConfirm.rows) {
        if (!member.barberId) {
          gbLogger.warn('Member has no assigned barber', {
            groupBookingId,
            memberId: member.id,
          })
          continue
        }

        try {
          // Create appointment
          const appointmentResult = await query<{ id: string }>(
            `INSERT INTO appointments 
             (shop_id, customer_id, barber_id, start_time, end_time, service_type, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)
             RETURNING id`,
            [
              booking.shopId,
              member.customerId || null,
              member.barberId,
              member.slotTime,
              new Date(member.slotTime.getTime() + 30 * 60000), // 30 min default duration
              member.serviceType || 'Group Booking Service',
              `Group booking: ${booking.groupName}`,
            ]
          )

          // Update member with appointment ID
          if (appointmentResult.rows[0]) {
            await query(
              `UPDATE group_booking_members 
               SET appointment_id = $1, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [appointmentResult.rows[0].id, member.id]
            )
          }
        } catch (error) {
          gbLogger.error('Error creating appointment for member', error, {
            groupBookingId,
            memberId: member.id,
          })
        }
      }

      // Update group status based on confirmed members
      const confirmedCount = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM group_booking_members 
         WHERE group_booking_id = $1 AND status = 'confirmed'`,
        [groupBookingId]
      )

      const activeCount = await query<{ count: number }>(
        `SELECT COUNT(*) as count FROM group_booking_members 
         WHERE group_booking_id = $1 AND status IN ('pending', 'confirmed')`,
        [groupBookingId]
      )

      const confirmed = confirmedCount.rows[0]?.count || 0
      const active = activeCount.rows[0]?.count || 0

      const newStatus = confirmed === active ? 'confirmed' : 'partial-confirmed'

      await query(
        `UPDATE group_bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newStatus, groupBookingId]
      )

      gbLogger.info('Group members confirmed', {
        groupBookingId,
        confirmed,
        newStatus,
      })
    } catch (error) {
      gbLogger.error('Error confirming group members', error)
      throw error
    }
  }

  /**
   * Cancel entire group booking
   */
  async cancelGroupBooking(groupBookingId: string, reason?: string): Promise<void> {
    gbLogger.info('Cancelling group booking', { groupBookingId, reason })

    try {
      // Cancel all members
      await query(
        `UPDATE group_booking_members 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE group_booking_id = $1 AND status != 'completed'`,
        [groupBookingId]
      )

      // Update group status
      await query(
        `UPDATE group_bookings 
         SET status = 'cancelled', notes = COALESCE(notes || ' | ', '') || $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [reason || 'Group cancelled', groupBookingId]
      )

      // Also cancel associated appointments
      await query(
        `UPDATE appointments 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id IN (
           SELECT appointment_id FROM group_booking_members WHERE group_booking_id = $1
         ) AND status != 'completed'`,
        [groupBookingId]
      )

      gbLogger.info('Group booking cancelled', { groupBookingId })
    } catch (error) {
      gbLogger.error('Error cancelling group booking', error)
      throw error
    }
  }

  /**
   * Get shop's group bookings
   */
  async getShopGroupBookings(
    shopId: string,
    status?: string
  ): Promise<GroupBooking[]> {
    try {
      const result = await query<GroupBooking>(
        `SELECT * FROM group_bookings 
         WHERE shop_id = $1 ${status ? 'AND status = $2' : ''}
         ORDER BY created_at DESC`,
        status ? [shopId, status] : [shopId]
      )
      return result.rows
    } catch (error) {
      gbLogger.error('Error fetching shop group bookings', error)
      return []
    }
  }

  /**
   * Send invite to group member
   */
  async sendGroupInvite(
    groupBookingId: string,
    memberId: string,
    recipientEmail?: string,
    recipientPhone?: string
  ): Promise<string> {
    gbLogger.info('Sending group invite', {
      groupBookingId,
      memberId,
      recipientEmail,
    })

    try {
      const member = await query<GroupBookingMember>(
        'SELECT * FROM group_booking_members WHERE id = $1 AND group_booking_id = $2',
        [memberId, groupBookingId]
      )

      if (member.rows.length === 0) {
        throw new Error('Member not found')
      }

      const booking = await this.getGroupBooking(groupBookingId)
      if (!booking) throw new Error('Booking not found')

      // Generate invite token
      const inviteToken = require('crypto').randomBytes(32).toString('hex')

      // Create invite record
      const email = recipientEmail || member.rows[0].guestEmail
      const phone = recipientPhone || member.rows[0].guestPhone

      const result = await query<{ id: string }>(
        `INSERT INTO group_booking_invites 
         (group_booking_id, group_member_id, recipient_email, recipient_phone, invite_token, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, 'sent', CURRENT_TIMESTAMP)
         RETURNING id`,
        [groupBookingId, memberId, email, phone, inviteToken]
      )

      // Send email invite
      if (email) {
        const inviteUrl = `${process.env.APP_URL || 'http://localhost:3000'}/group-invite/${inviteToken}`
        await emailService.sendGroupInvite({
          recipientEmail: email,
          groupName: booking.groupName,
          slotTime: member.rows[0].slotTime.toISOString(),
          inviteUrl,
        })
      }

      // Send SMS invite
      if (phone) {
        await smsService.send({
          phoneNumber: phone,
          message: `You're invited to join a group booking at our barbershop! Group: ${booking.groupName}. Accept here: ${process.env.APP_URL || 'http://localhost:3000'}/group-invite/${inviteToken}`,
        })
      }

      gbLogger.info('Group invite sent', {
        groupBookingId,
        memberId,
        inviteId: result.rows[0]?.id,
      })

      return inviteToken
    } catch (error) {
      gbLogger.error('Error sending group invite', error)
      throw error
    }
  }

  /**
   * Get available slots for multiple barbers
   */
  async getAvailableSlots(
    shopId: string,
    startDate: Date,
    endDate: Date,
    barberIds?: string[],
    slotDurationMinutes: number = 30
  ): Promise<Map<string, Date[]>> {
    gbLogger.debug('Getting available slots', {
      shopId,
      startDate,
      endDate,
      barberIds,
    })

    try {
      // Get all barbers for shop if not specified
      let barbersToCheck = barberIds
      if (!barberIds || barberIds.length === 0) {
        const barberResult = await query<{ id: string }>(
          'SELECT id FROM barbers WHERE shop_id = $1',
          [shopId]
        )
        barbersToCheck = barberResult.rows.map((b) => b.id)
      }

      const slotMap = new Map<string, Date[]>()

      for (const barberId of barbersToCheck || []) {
        const slots: Date[] = []

        // Query booked slots
        const bookedResult = await query<{ start_time: Date; end_time: Date }>(
          `SELECT start_time, end_time FROM appointments 
           WHERE barber_id = $1 AND start_time >= $2 AND start_time < $3 AND status IN ('confirmed', 'completed')`,
          [barberId, startDate, endDate]
        )

        const bookedSlots = bookedResult.rows
        const current = new Date(startDate)

        while (current < endDate) {
          const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60000)

          // Check if slot overlaps with any booking
          const hasConflict = bookedSlots.some(
            (booking) => current < booking.end_time && slotEnd > booking.start_time
          )

          if (!hasConflict) {
            slots.push(new Date(current))
          }

          current.setMinutes(current.getMinutes() + slotDurationMinutes)
        }

        slotMap.set(barberId, slots)
      }

      return slotMap
    } catch (error) {
      gbLogger.error('Error getting available slots', error)
      return new Map()
    }
  }
}

// Export singleton
export const groupBookingService = new GroupBookingService()

export default GroupBookingService
