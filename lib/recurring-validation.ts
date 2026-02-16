import { z } from 'zod';

/**
 * Validation schemas for Recurring Appointments, Waitlist, and Loyalty features
 */

// ============ Recurring Appointments ============

export const RecurrenceTypeEnum = z.enum(['weekly', 'bi-weekly', 'monthly']);

export const CreateRecurringAppointmentSchema = z.object({
  customerId: z.number().positive('Customer ID must be positive'),
  barberId: z.number().positive('Barber ID must be positive').optional(),
  shopId: z.number().positive('Shop ID must be positive'),
  serviceName: z.string().min(1, 'Service name is required').optional(),
  recurrenceType: RecurrenceTypeEnum,
  dayOfWeek: z.number().min(0).max(6, 'Day of week must be 0-6').optional(),
  dayOfMonth: z.number().min(1).max(31, 'Day of month must be 1-31').optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  startDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), 'Invalid end date').optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.recurrenceType === 'weekly' || data.recurrenceType === 'bi-weekly') {
    return data.dayOfWeek !== undefined && data.dayOfWeek !== null;
  }
  if (data.recurrenceType === 'monthly') {
    return data.dayOfMonth !== undefined && data.dayOfMonth !== null;
  }
  return true;
}, 'Day of week required for weekly/bi-weekly, day of month required for monthly');

export type CreateRecurringAppointmentInput = z.infer<typeof CreateRecurringAppointmentSchema>;

export const UpdateRecurringAppointmentSchema = z.object({
  id: z.number().positive('Recurring appointment ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  barberId: z.number().positive('Barber ID must be positive').optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  endDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), 'Invalid end date').optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export type UpdateRecurringAppointmentInput = z.infer<typeof UpdateRecurringAppointmentSchema>;

// ============ Waitlist ============

export const JoinWaitlistSchema = z.object({
  customerId: z.number().positive('Customer ID must be positive'),
  barberId: z.number().positive('Barber ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  preferredDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), 'Invalid preferred date'),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').optional(),
  priorityLevel: z.enum(['standard', 'priority']).default('standard'),
  notes: z.string().optional(),
});

export type JoinWaitlistInput = z.infer<typeof JoinWaitlistSchema>;

export const UpdateWaitlistPrioritySchema = z.object({
  id: z.number().positive('Waitlist ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  priorityLevel: z.enum(['standard', 'priority']),
  priorityFeeCharged: z.number().positive().optional(),
});

export type UpdateWaitlistPriorityInput = z.infer<typeof UpdateWaitlistPrioritySchema>;

export const PromoteWaitlistSchema = z.object({
  waitlistId: z.number().positive('Waitlist ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  appointmentId: z.number().positive('Appointment ID must be positive'),
});

export type PromoteWaitlistInput = z.infer<typeof PromoteWaitlistSchema>;

// ============ Loyalty & Referral ============

export const EarnLoyaltyPointsSchema = z.object({
  customerId: z.number().positive('Customer ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  appointmentId: z.number().positive('Appointment ID must be positive'),
  amount: z.number().positive('Amount must be positive'),
});

export type EarnLoyaltyPointsInput = z.infer<typeof EarnLoyaltyPointsSchema>;

export const RedeemLoyaltyPointsSchema = z.object({
  customerId: z.number().positive('Customer ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  pointsToRedeem: z.number().positive('Points to redeem must be positive'),
  appointmentId: z.number().positive('Appointment ID must be positive'),
});

export type RedeemLoyaltyPointsInput = z.infer<typeof RedeemLoyaltyPointsSchema>;

export const GenerateReferralCodeSchema = z.object({
  customerId: z.number().positive('Customer ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
});

export type GenerateReferralCodeInput = z.infer<typeof GenerateReferralCodeSchema>;

export const ValidateReferralCodeSchema = z.object({
  referralCode: z.string().min(1, 'Referral code is required'),
  shopId: z.number().positive('Shop ID must be positive'),
});

export type ValidateReferralCodeInput = z.infer<typeof ValidateReferralCodeSchema>;

export const ApplyReferralRewardSchema = z.object({
  referralCode: z.string().min(1, 'Referral code is required'),
  refereeCustomerId: z.number().positive('Customer ID must be positive'),
  shopId: z.number().positive('Shop ID must be positive'),
  appointmentId: z.number().positive('Appointment ID must be positive'),
});

export type ApplyReferralRewardInput = z.infer<typeof ApplyReferralRewardSchema>;

export default {
  CreateRecurringAppointmentSchema,
  UpdateRecurringAppointmentSchema,
  JoinWaitlistSchema,
  UpdateWaitlistPrioritySchema,
  PromoteWaitlistSchema,
  EarnLoyaltyPointsSchema,
  RedeemLoyaltyPointsSchema,
  GenerateReferralCodeSchema,
  ValidateReferralCodeSchema,
  ApplyReferralRewardSchema,
};
