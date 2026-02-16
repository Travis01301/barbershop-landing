import { z } from 'zod'

/**
 * Validation schemas for Group Booking API endpoints
 */

// ============ Group Booking Creation ============

export const CreateGroupBookingSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID format'),
  groupName: z.string().min(1, 'Group name is required').max(255, 'Group name too long'),
  groupSize: z.number().int().min(2, 'Group size must be at least 2').max(100, 'Group size cannot exceed 100'),
  notes: z.string().optional(),
})

export type CreateGroupBookingInput = z.infer<typeof CreateGroupBookingSchema>

// ============ Add Member to Group ============

export const AddGroupMemberSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  barberId: z.string().uuid('Invalid barber ID').optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email('Invalid email format').optional(),
  guestPhone: z.string().optional(),
  slotTime: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid slot time format'
  ),
  serviceType: z.string().optional(),
  servicePrice: z.number().positive('Service price must be positive'),
})

export type AddGroupMemberInput = z.infer<typeof AddGroupMemberSchema>

// ============ Assign Barber to Member ============

export const AssignBarberSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  memberId: z.string().uuid('Invalid member ID'),
  barberId: z.string().uuid('Invalid barber ID'),
  slotTime: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid slot time format'
  ),
})

export type AssignBarberInput = z.infer<typeof AssignBarberSchema>

// ============ Update Group Booking ============

export const UpdateGroupBookingSchema = z.object({
  groupName: z.string().min(1).max(255).optional(),
  notes: z.string().optional(),
})

export type UpdateGroupBookingInput = z.infer<typeof UpdateGroupBookingSchema>

// ============ Confirm Group Booking ============

export const ConfirmGroupBookingSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  memberIds: z.array(z.string().uuid()).optional(), // If not provided, confirms all
})

export type ConfirmGroupBookingInput = z.infer<typeof ConfirmGroupBookingSchema>

// ============ Cancel Group Booking ============

export const CancelGroupBookingSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  reason: z.string().optional(),
  refundType: z.enum(['full', 'partial', 'none']).optional(),
})

export type CancelGroupBookingInput = z.infer<typeof CancelGroupBookingSchema>

// ============ Remove Member from Group ============

export const RemoveGroupMemberSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  memberId: z.string().uuid('Invalid member ID'),
  reason: z.string().optional(),
})

export type RemoveGroupMemberInput = z.infer<typeof RemoveGroupMemberSchema>

// ============ Group Payment ============

export const GroupPaymentSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  amount: z.number().positive('Amount must be positive'),
  email: z.string().email('Valid email is required'),
  paymentMethodType: z.enum(['card', 'apple_pay', 'google_pay']).optional(),
})

export type GroupPaymentInput = z.infer<typeof GroupPaymentSchema>

// ============ Get Available Slots ============

export const GetAvailableSlotsSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  barberIds: z.array(z.string().uuid('Invalid barber ID')).optional(),
  startDate: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid start date'
  ),
  endDate: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid end date'
  ),
  slotDurationMinutes: z.number().int().positive().optional(),
})

export type GetAvailableSlotsInput = z.infer<typeof GetAvailableSlotsSchema>

// ============ Set Group Discount Rules ============

export const SetGroupDiscountSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  minGroupSize: z.number().int().min(2, 'Minimum group size must be at least 2'),
  discountPercent: z.number().min(0, 'Discount must be >= 0').max(100, 'Discount cannot exceed 100'),
  description: z.string().optional(),
})

export type SetGroupDiscountInput = z.infer<typeof SetGroupDiscountSchema>

// ============ Send Group Invite ============

export const SendGroupInviteSchema = z.object({
  groupBookingId: z.string().uuid('Invalid group booking ID'),
  memberId: z.string().uuid('Invalid member ID'),
  recipientEmail: z.string().email('Invalid email format').optional(),
  recipientPhone: z.string().optional(),
})

export type SendGroupInviteInput = z.infer<typeof SendGroupInviteSchema>

export default {
  CreateGroupBookingSchema,
  AddGroupMemberSchema,
  AssignBarberSchema,
  UpdateGroupBookingSchema,
  ConfirmGroupBookingSchema,
  CancelGroupBookingSchema,
  RemoveGroupMemberSchema,
  GroupPaymentSchema,
  GetAvailableSlotsSchema,
  SetGroupDiscountSchema,
  SendGroupInviteSchema,
}
