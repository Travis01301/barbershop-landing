import { z } from 'zod';

// Commission Rate Schemas
export const TieredRuleSchema = z.object({
  threshold: z.number().positive(),
  rate: z.number().min(0).max(100),
});

export const CommissionRateCreateSchema = z.object({
  rate_type: z.enum(['flat', 'tiered', 'service_specific']),
  base_rate: z.number().min(0.01).max(100),
  tiered_rules: z.array(TieredRuleSchema).optional(),
  service_rates: z.record(z.string(), z.number().min(0).max(100)).optional(),
});

export const CommissionRateUpdateSchema = CommissionRateCreateSchema.partial();

// Barber Commission Override Schemas
export const BarberCommissionOverrideSchema = z.object({
  rate_type: z.enum(['flat', 'tiered', 'service_specific']).optional(),
  base_rate: z.number().min(0.01).max(100).optional(),
  tiered_rules: z.array(TieredRuleSchema).optional(),
  service_rates: z.record(z.string(), z.number().min(0).max(100)).optional(),
  expires_at: z.date().optional(),
});

// Commission Transaction Schemas
export const CommissionCalculationInputSchema = z.object({
  appointment_id: z.string().uuid(),
  barber_id: z.string().uuid(),
  service_type: z.string().min(1),
  service_price: z.number().nonnegative(),
  discount_amount: z.number().nonnegative().default(0),
  tip_amount: z.number().nonnegative().default(0),
  include_tip_in_commission: z.boolean().default(false),
  transaction_month: z.date().optional(),
});

export const CommissionTransactionFilterSchema = z.object({
  barber_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']).optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().nonnegative().default(0),
});

// Commission Bonus Schemas
export const CommissionBonusCreateSchema = z.object({
  barber_id: z.string().uuid(),
  bonus_type: z.enum(['volume', 'revenue', 'retention', 'rating', 'custom']),
  trigger_metric: z.string().min(1),
  trigger_value: z.number().nonnegative(),
  bonus_amount: z.number().positive().optional(),
  bonus_percentage: z.number().min(0).max(100).optional(),
  calculation_month: z.date(),
});

export const CommissionBonusCreateSchema2 = CommissionBonusCreateSchema.refine(
  (data) => data.bonus_amount || data.bonus_percentage,
  {
    message: 'Either bonus_amount or bonus_percentage must be provided',
  }
);

// Commission Deduction Schemas
export const CommissionDeductionCreateSchema = z.object({
  barber_id: z.string().uuid(),
  deduction_type: z.enum(['damages', 'chargebacks', 'advances', 'other']),
  amount: z.number().positive(),
  reason: z.string().min(1),
  related_transaction_id: z.string().uuid().optional(),
});

// Commission Payout Schemas
export const CommissionPayoutCalculateSchema = z.object({
  barber_id: z.string().uuid().optional(),
  period_start: z.date(),
  period_end: z.date(),
});

export const CommissionPayoutProcessSchema = z.object({
  payout_ids: z.array(z.string().uuid()),
  payout_method: z.enum(['cash', 'bank_transfer', 'stripe_connect']),
  stripe_payout_id: z.string().optional(),
});

export const CommissionPayoutFilterSchema = z.object({
  barber_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().nonnegative().default(0),
});

// Monthly Statement Schemas
export const MonthlyStatementRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  barber_id: z.string().uuid(),
});

// Advance Request Schemas
export const AdvanceRequestSchema = z.object({
  barber_id: z.string().uuid(),
  requested_amount: z.number().positive(),
});

export const AdvanceApprovalSchema = z.object({
  advance_id: z.string().uuid(),
  approved: z.boolean(),
  rejection_reason: z.string().optional(),
});

// Dashboard Filter Schemas
export const CommissionDashboardFilterSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  sort_by: z.enum(['commission', 'appointments', 'revenue']).default('commission'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(50),
});

export const CommissionAnalyticsFilterSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  period: z.enum(['month', 'quarter', 'year']).default('month'),
});

// Type inference for validation schemas
export type CommissionRateCreate = z.infer<typeof CommissionRateCreateSchema>;
export type CommissionCalculationInput = z.infer<typeof CommissionCalculationInputSchema>;
export type CommissionBonusCreate = z.infer<typeof CommissionBonusCreateSchema>;
export type CommissionDeductionCreate = z.infer<typeof CommissionDeductionCreateSchema>;
export type CommissionPayoutCalculate = z.infer<typeof CommissionPayoutCalculateSchema>;
export type CommissionPayoutProcess = z.infer<typeof CommissionPayoutProcessSchema>;
export type AdvanceRequest = z.infer<typeof AdvanceRequestSchema>;
export type AdvanceApproval = z.infer<typeof AdvanceApprovalSchema>;
