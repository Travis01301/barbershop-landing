// Commission Tracking System Types

export interface CommissionRate {
  id: string;
  shop_id: string;
  rate_type: 'flat' | 'tiered' | 'service_specific';
  base_rate: number;
  tiered_rules?: Array<{ threshold: number; rate: number }>;
  service_rates?: Record<string, number>;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface BarberCommissionOverride {
  id: string;
  shop_id: string;
  barber_id: string;
  rate_type?: 'flat' | 'tiered' | 'service_specific';
  base_rate?: number;
  tiered_rules?: Array<{ threshold: number; rate: number }>;
  service_rates?: Record<string, number>;
  effective_date: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CommissionTransaction {
  id: string;
  shop_id: string;
  barber_id: string;
  appointment_id: string;
  service_type: string;
  service_price: number;
  discount_amount: number;
  tip_amount: number;
  include_tip_in_commission: boolean;
  commission_rate: number;
  base_commission: number;
  commission_after_adjustments?: number;
  transaction_month: Date;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  transaction_date: Date;
  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
  refund_reason?: string;
}

export interface CommissionSplit {
  id: string;
  shop_id: string;
  commission_transaction_id: string;
  barber_id: string;
  split_percentage: number;
  split_amount: number;
  created_at: Date;
}

export interface CommissionBonus {
  id: string;
  shop_id: string;
  barber_id: string;
  bonus_type: 'volume' | 'revenue' | 'retention' | 'rating' | 'custom';
  trigger_metric: string;
  trigger_value: number;
  bonus_amount?: number;
  bonus_percentage?: number;
  calculation_month: Date;
  bonus_status: 'pending' | 'earned' | 'paid';
  earned_at?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CommissionDeduction {
  id: string;
  shop_id: string;
  barber_id: string;
  deduction_type: 'damages' | 'chargebacks' | 'advances' | 'other';
  amount: number;
  reason: string;
  related_transaction_id?: string;
  deduction_date: Date;
  status: 'pending' | 'applied' | 'reversed';
  applied_at?: Date;
  reversed_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CommissionPayout {
  id: string;
  shop_id: string;
  barber_id: string;
  payout_period_start: Date;
  payout_period_end: Date;
  total_commission: number;
  bonuses: number;
  deductions: number;
  tax_withheld: number;
  net_payout: number;
  payout_method?: 'cash' | 'bank_transfer' | 'stripe_connect';
  stripe_payout_id?: string;
  payout_status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_date?: Date;
  failure_reason?: string;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CommissionReconciliation {
  id: string;
  shop_id: string;
  barber_id: string;
  reconciliation_period: Date;
  total_appointments: number;
  total_revenue: number;
  total_commission: number;
  total_bonuses: number;
  total_deductions: number;
  tax_withheld: number;
  net_earnings: number;
  payout_status?: string;
  dispute_count: number;
  notes?: string;
  reconciled_at?: Date;
  reconciled_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommissionAdvance {
  id: string;
  shop_id: string;
  barber_id: string;
  requested_amount: number;
  available_balance: number;
  advance_status: 'pending' | 'approved' | 'paid' | 'rejected';
  request_date: Date;
  approved_at?: Date;
  approved_by?: string;
  paid_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// DTO types for API requests/responses
export interface CreateCommissionRateDTO {
  rate_type: 'flat' | 'tiered' | 'service_specific';
  base_rate: number;
  tiered_rules?: Array<{ threshold: number; rate: number }>;
  service_rates?: Record<string, number>;
}

export interface UpdateBarberCommissionDTO {
  rate_type?: 'flat' | 'tiered' | 'service_specific';
  base_rate?: number;
  tiered_rules?: Array<{ threshold: number; rate: number }>;
  service_rates?: Record<string, number>;
  expires_at?: Date;
}

export interface CommissionCalculationInput {
  appointment_id: string;
  barber_id: string;
  service_type: string;
  service_price: number;
  discount_amount?: number;
  tip_amount?: number;
  include_tip_in_commission?: boolean;
  transaction_month?: Date;
}

export interface MonthlyCommissionStatement {
  month: Date;
  barber_id: string;
  transactions: CommissionTransaction[];
  bonuses: CommissionBonus[];
  deductions: CommissionDeduction[];
  total_appointments: number;
  total_revenue: number;
  total_commission: number;
  total_bonuses: number;
  total_deductions: number;
  tax_withheld: number;
  net_earnings: number;
  year_to_date_summary: YearToDateSummary;
}

export interface YearToDateSummary {
  total_appointments: number;
  total_revenue: number;
  total_commission: number;
  total_bonuses: number;
  total_deductions: number;
  total_tax_withheld: number;
  total_earnings: number;
}

export interface CommissionDashboardData {
  shop_id: string;
  month: Date;
  barber_summaries: BarberCommissionSummary[];
  shop_totals: CommissionShopTotals;
  top_earners: BarberCommissionSummary[];
}

export interface BarberCommissionSummary {
  barber_id: string;
  barber_name: string;
  appointments: number;
  total_revenue: number;
  total_commission: number;
  bonuses: number;
  deductions: number;
  tax_withheld: number;
  net_earnings: number;
  commission_rate: number;
  performance_rank: number;
}

export interface CommissionShopTotals {
  total_barbers: number;
  total_appointments: number;
  total_revenue: number;
  total_commission: number;
  total_bonuses: number;
  total_deductions: number;
  total_tax_withheld: number;
  total_earnings: number;
  commission_expense_percentage: number;
}

export interface CommissionAnalyticsData {
  month: Date;
  revenue_trend: Array<{ date: Date; revenue: number; commission: number }>;
  top_earners: Array<{ barber_name: string; earnings: number; appointments: number }>;
  service_breakdown: Array<{ service_type: string; revenue: number; count: number }>;
  commission_distribution: Array<{ range: string; count: number }>;
}
