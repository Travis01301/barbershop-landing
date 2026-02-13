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
