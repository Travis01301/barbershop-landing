import { z } from 'zod';
import { logger } from './logger';

/**
 * Validation Schemas for API endpoints
 * Using Zod for runtime type checking and error messages
 */

// ============ Payment Intent ============

export const PaymentIntentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  amount: z.number().positive('Amount must be positive'),
  email: z.string().email('Valid email is required'),
  description: z.string().optional(),
});

export type PaymentIntentInput = z.infer<typeof PaymentIntentSchema>;

// ============ Available Slots ============

export const AvailableSlotsSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  barberId: z.string().min(1, 'Barber ID is required'),
  date: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid date format'
  ),
});

export type AvailableSlotsInput = z.infer<typeof AvailableSlotsSchema>;

// ============ Booking ============

export const BookingSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  barberId: z.string().min(1, 'Barber ID is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  appointmentTime: z.string().refine(
    (time) => !isNaN(new Date(time).getTime()),
    'Invalid appointment time'
  ),
  serviceName: z.string().optional(),
  notes: z.string().optional(),
});

export type BookingInput = z.infer<typeof BookingSchema>;

// ============ Login ============

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============ Signup ============

export const SignupSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
});

export type SignupInput = z.infer<typeof SignupSchema>;

// ============ Barber Creation ============

export const CreateBarberSchema = z.object({
  name: z.string().min(1, 'Barber name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateBarberInput = z.infer<typeof CreateBarberSchema>;

// ============ Customer Creation ============

export const CreateCustomerSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

// ============ Service Creation ============

export const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  base_price: z.number().positive('Price must be positive'),
  duration_minutes: z.number().positive('Duration must be positive'),
  category: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

// ============ Review Submission ============

export const ReviewSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  barberId: z.string().min(1, 'Barber ID is required'),
  shopId: z.string().min(1, 'Shop ID is required'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().optional(),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

// ============ Gift Card Creation ============

export const CreateGiftCardSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email('Valid email format').optional(),
  message: z.string().optional(),
  expiresAt: z.string().optional(),
  purchasedByEmail: z.string().email('Valid email format').optional(),
});

export type CreateGiftCardInput = z.infer<typeof CreateGiftCardSchema>;

// ============ Time-Off Request ============

export const TimeOffSchema = z.object({
  barberId: z.string().min(1, 'Barber ID is required'),
  startDate: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid start date format'
  ),
  endDate: z.string().refine(
    (date) => !isNaN(new Date(date).getTime()),
    'Invalid end date format'
  ),
  reason: z.string().optional(),
});

export type TimeOffInput = z.infer<typeof TimeOffSchema>;

// ============ Schedule Creation ============

export const CreateScheduleSchema = z.object({
  barberId: z.string().min(1, 'Barber ID is required'),
  dayOfWeek: z.number().min(0, 'Day of week must be 0-6').max(6, 'Day of week must be 0-6'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isActive: z.boolean().optional(),
});

export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

// ============ Account Activation ============

export const ActivateAccountSchema = z.object({
  token: z.string().min(1, 'Activation token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type ActivateAccountInput = z.infer<typeof ActivateAccountSchema>;

// ============ Validation Helper ============

/**
 * Validates input against a schema
 * Returns errors if validation fails, data if successful
 */
export function validateInput<T>(
  schema: z.ZodSchema,
  data: unknown,
  context: string
): { success: boolean; data?: T; errors?: Record<string, string> } {
  const valLogger = logger.createChild(`validation.${context}`);

  try {
    const result = schema.parse(data);
    valLogger.debug('Validation passed', { fields: Object.keys(data || {}) });
    return { success: true, data: result as T };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      err.issues.forEach((issue) => {
        const path = issue.path.join('.') || '_root';
        errors[path] = issue.message;
      });
      valLogger.warn('Validation failed', { errors });
      return { success: false, errors };
    }
    valLogger.error('Unexpected validation error', err);
    return { success: false, errors: { _error: 'Validation error' } };
  }
}

/**
 * Parse query parameter (handles both string and array forms)
 */
export function parseQueryParam(
  param: string | string[] | undefined
): string | null {
  if (!param) return null;
  if (Array.isArray(param)) return param[0] || null;
  return param;
}

/**
 * Sanitize string input (remove leading/trailing whitespace, prevent injection)
 */
export function sanitizeString(input: string): string {
  return input.trim().slice(0, 1000); // Limit to 1000 chars
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic, 7-15 digits)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export default {
  PaymentIntentSchema,
  AvailableSlotsSchema,
  BookingSchema,
  validateInput,
  parseQueryParam,
  sanitizeString,
  isValidEmail,
  isValidPhone,
  isValidUUID,
};
