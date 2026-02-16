import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  CommissionRate,
  BarberCommissionOverride,
  CommissionTransaction,
  CommissionBonus,
  CommissionDeduction,
  CommissionPayout,
  CommissionCalculationInput,
  MonthlyCommissionStatement,
  BarberCommissionSummary,
  CommissionDashboardData,
} from '@/lib/types/commission';

export class CommissionService {
  constructor(private client: Client) {}

  /**
   * Get the active commission rate for a barber
   * Checks for override first, then falls back to shop default
   */
  async getActiveCommissionRate(
    shopId: string,
    barberId: string,
    asOfDate: Date = new Date()
  ): Promise<CommissionRate | null> {
    // Check for active barber override
    const overrideQuery = `
      SELECT bco.* FROM barber_commission_overrides bco
      WHERE bco.shop_id = $1 
        AND bco.barber_id = $2
        AND bco.effective_date <= $3
        AND (bco.expires_at IS NULL OR bco.expires_at > $3)
      ORDER BY bco.effective_date DESC
      LIMIT 1
    `;

    const overrideResult = await this.client.query(overrideQuery, [shopId, barberId, asOfDate]);
    
    if (overrideResult.rows.length > 0) {
      const override = overrideResult.rows[0];
      // Merge override with default
      const defaultRate = await this.getDefaultCommissionRate(shopId);
      return this.mergeOverrideWithDefault(defaultRate, override);
    }

    // Return default shop rate
    return this.getDefaultCommissionRate(shopId);
  }

  /**
   * Get shop's default commission rate
   */
  private async getDefaultCommissionRate(shopId: string): Promise<CommissionRate | null> {
    const query = `
      SELECT * FROM commission_rates
      WHERE shop_id = $1 AND is_default = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const result = await this.client.query(query, [shopId]);
    return result.rows[0] || null;
  }

  /**
   * Merge barber override with default rate
   */
  private mergeOverrideWithDefault(
    defaultRate: CommissionRate | null,
    override: Partial<CommissionRate>
  ): CommissionRate {
    if (!defaultRate) {
      throw new Error('No default commission rate found');
    }

    return {
      ...defaultRate,
      ...override,
      rate_type: override.rate_type || defaultRate.rate_type,
      base_rate: override.base_rate || defaultRate.base_rate,
      tiered_rules: override.tiered_rules || defaultRate.tiered_rules,
      service_rates: override.service_rates || defaultRate.service_rates,
    };
  }

  /**
   * Calculate commission for a single appointment
   */
  async calculateCommission(input: CommissionCalculationInput, shopId: string): Promise<CommissionTransaction> {
    const { appointment_id, barber_id, service_type, service_price, discount_amount = 0, tip_amount = 0, include_tip_in_commission = false, transaction_month = new Date() } = input;

    // Get commission rate
    const rate = await this.getActiveCommissionRate(shopId, barber_id);
    if (!rate) {
      throw new Error('No commission rate configured for this barber');
    }

    // Get month start and year-to-date revenue
    const monthStart = this.getMonthStart(transaction_month);
    const yearStart = new Date(transaction_month.getFullYear(), 0, 1);

    // Calculate commissionable amount
    let commissionableAmount = service_price - discount_amount;
    if (include_tip_in_commission) {
      commissionableAmount += tip_amount;
    }

    // Get commission percentage based on rate type and month-to-date revenue
    const monthRevenue = await this.getMonthlyRevenue(shopId, barber_id, monthStart);
    const monthToDateRevenue = monthRevenue + service_price;
    const commissionRate = this.getApplicableCommissionRate(rate, monthToDateRevenue, service_type);

    // Calculate base commission
    const baseCommission = (commissionableAmount * commissionRate) / 100;

    // Create transaction record
    const transactionId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO commission_transactions (
        id, shop_id, barber_id, appointment_id, service_type,
        service_price, discount_amount, tip_amount, include_tip_in_commission,
        commission_rate, base_commission, transaction_month,
        status, transaction_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const result = await this.client.query(query, [
      transactionId,
      shopId,
      barber_id,
      appointment_id,
      service_type,
      service_price,
      discount_amount,
      tip_amount,
      include_tip_in_commission,
      commissionRate,
      baseCommission,
      monthStart,
      'completed',
      now,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Get applicable commission rate based on tiered structure
   */
  private getApplicableCommissionRate(
    rate: CommissionRate,
    monthlyRevenue: number,
    serviceType?: string
  ): number {
    // Check service-specific rate first
    if (rate.service_rates && serviceType && rate.service_rates[serviceType]) {
      return rate.service_rates[serviceType];
    }

    // Check tiered rates
    if (rate.tiered_rules && rate.tiered_rules.length > 0) {
      const sortedTiers = [...rate.tiered_rules].sort((a, b) => b.threshold - a.threshold);
      for (const tier of sortedTiers) {
        if (monthlyRevenue >= tier.threshold) {
          return tier.rate;
        }
      }
    }

    // Fall back to base rate
    return rate.base_rate;
  }

  /**
   * Get total revenue for a barber in a given month
   */
  private async getMonthlyRevenue(shopId: string, barberId: string, monthStart: Date): Promise<number> {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const query = `
      SELECT COALESCE(SUM(ct.service_price), 0) as total
      FROM commission_transactions ct
      WHERE ct.shop_id = $1 
        AND ct.barber_id = $2
        AND ct.transaction_date >= $3
        AND ct.transaction_date < $4
        AND ct.status IN ('completed', 'pending')
    `;

    const result = await this.client.query(query, [shopId, barberId, monthStart, monthEnd]);
    return parseFloat(result.rows[0]?.total || 0);
  }

  /**
   * Cancel appointment and refund commission
   */
  async cancelAppointmentCommission(
    shopId: string,
    appointmentId: string,
    refundReason: string
  ): Promise<void> {
    const query = `
      UPDATE commission_transactions
      SET status = 'refunded',
          cancelled_at = NOW(),
          refund_reason = $3,
          updated_at = NOW()
      WHERE shop_id = $1 AND appointment_id = $2
    `;

    await this.client.query(query, [shopId, appointmentId, refundReason]);
  }

  /**
   * Apply bonus to barber for a month
   */
  async applyBonus(bonus: CommissionBonus): Promise<CommissionBonus> {
    const bonusId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO commission_bonuses (
        id, shop_id, barber_id, bonus_type, trigger_metric,
        trigger_value, bonus_amount, bonus_percentage, calculation_month,
        bonus_status, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await this.client.query(query, [
      bonusId,
      bonus.shop_id,
      bonus.barber_id,
      bonus.bonus_type,
      bonus.trigger_metric,
      bonus.trigger_value,
      bonus.bonus_amount || null,
      bonus.bonus_percentage || null,
      bonus.calculation_month,
      'pending',
      now,
      now,
      bonus.created_by,
    ]);

    return result.rows[0];
  }

  /**
   * Calculate performance bonuses for a barber in a month
   */
  async calculatePerformanceBonuses(
    shopId: string,
    barberId: string,
    month: Date
  ): Promise<CommissionBonus[]> {
    const monthStart = this.getMonthStart(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Get barber's metrics for the month
    const metricsQuery = `
      SELECT
        COUNT(DISTINCT appointment_id) as appointment_count,
        COALESCE(SUM(service_price), 0) as total_revenue
      FROM commission_transactions
      WHERE shop_id = $1 AND barber_id = $2
        AND transaction_date >= $3 AND transaction_date < $4
        AND status IN ('completed', 'pending')
    `;

    const metricsResult = await this.client.query(metricsQuery, [shopId, barberId, monthStart, monthEnd]);
    const { appointment_count, total_revenue } = metricsResult.rows[0];

    const bonuses: CommissionBonus[] = [];

    // Volume bonus (50+ appointments)
    if (appointment_count >= 50) {
      const bonus = await this.applyBonus({
        id: uuidv4(),
        shop_id: shopId,
        barber_id: barberId,
        bonus_type: 'volume',
        trigger_metric: 'appointments',
        trigger_value: 50,
        bonus_amount: 50,
        calculation_month: monthStart,
        bonus_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      });
      bonuses.push(bonus);
    }

    // Revenue bonus ($2000+)
    if (total_revenue >= 2000) {
      const bonus = await this.applyBonus({
        id: uuidv4(),
        shop_id: shopId,
        barber_id: barberId,
        bonus_type: 'revenue',
        trigger_metric: 'monthly_revenue',
        trigger_value: 2000,
        bonus_percentage: 5,
        calculation_month: monthStart,
        bonus_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      });
      bonuses.push(bonus);
    }

    return bonuses;
  }

  /**
   * Apply deduction to barber
   */
  async applyDeduction(deduction: CommissionDeduction): Promise<CommissionDeduction> {
    const deductionId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO commission_deductions (
        id, shop_id, barber_id, deduction_type, amount, reason,
        related_transaction_id, deduction_date, status, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.client.query(query, [
      deductionId,
      deduction.shop_id,
      deduction.barber_id,
      deduction.deduction_type,
      deduction.amount,
      deduction.reason,
      deduction.related_transaction_id || null,
      deduction.deduction_date || new Date(),
      'pending',
      now,
      now,
      deduction.created_by,
    ]);

    return result.rows[0];
  }

  /**
   * Get monthly commission statement for a barber
   */
  async getMonthlyStatement(
    shopId: string,
    barberId: string,
    month: Date
  ): Promise<MonthlyCommissionStatement> {
    const monthStart = this.getMonthStart(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Get transactions
    const transactionsQuery = `
      SELECT * FROM commission_transactions
      WHERE shop_id = $1 AND barber_id = $2
        AND transaction_date >= $3 AND transaction_date < $4
      ORDER BY transaction_date ASC
    `;
    const transactionsResult = await this.client.query(transactionsQuery, [shopId, barberId, monthStart, monthEnd]);
    const transactions = transactionsResult.rows;

    // Get bonuses
    const bonusesQuery = `
      SELECT * FROM commission_bonuses
      WHERE shop_id = $1 AND barber_id = $2
        AND calculation_month = $3
    `;
    const bonusesResult = await this.client.query(bonusesQuery, [shopId, barberId, monthStart]);
    const bonuses = bonusesResult.rows;

    // Get deductions
    const deductionsQuery = `
      SELECT * FROM commission_deductions
      WHERE shop_id = $1 AND barber_id = $2
        AND deduction_date >= $3 AND deduction_date < $4
        AND status != 'reversed'
    `;
    const deductionsResult = await this.client.query(deductionsQuery, [shopId, barberId, monthStart, monthEnd]);
    const deductions = deductionsResult.rows;

    // Calculate totals
    const totalAppointments = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.service_price, 0);
    const totalCommission = transactions.reduce((sum, t) => sum + (t.base_commission || 0), 0);

    const totalBonuses = bonuses.reduce((sum, b) => {
      if (b.bonus_amount) return sum + b.bonus_amount;
      return sum + (totalCommission * b.bonus_percentage) / 100;
    }, 0);

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const taxWithheld = totalCommission * 0.15; // 15% federal tax estimate
    const netEarnings = totalCommission + totalBonuses - totalDeductions - taxWithheld;

    // Get YTD summary
    const ytdQuery = `
      SELECT
        COUNT(DISTINCT appointment_id) as total_appointments,
        COALESCE(SUM(service_price), 0) as total_revenue,
        COALESCE(SUM(base_commission), 0) as total_commission
      FROM commission_transactions
      WHERE shop_id = $1 AND barber_id = $2
        AND EXTRACT(YEAR FROM transaction_date) = $3
        AND transaction_date < $4
        AND status IN ('completed', 'pending')
    `;

    const year = monthStart.getFullYear();
    const ytdResult = await this.client.query(ytdQuery, [shopId, barberId, year, monthEnd]);
    const ytdData = ytdResult.rows[0];

    return {
      month: monthStart,
      barber_id: barberId,
      transactions,
      bonuses,
      deductions,
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      total_commission: totalCommission,
      total_bonuses: totalBonuses,
      total_deductions: totalDeductions,
      tax_withheld: taxWithheld,
      net_earnings: netEarnings,
      year_to_date_summary: {
        total_appointments: ytdData.total_appointments,
        total_revenue: ytdData.total_revenue,
        total_commission: ytdData.total_commission,
        total_bonuses: 0, // Could be calculated separately
        total_deductions: 0,
        total_tax_withheld: ytdData.total_commission * 0.15,
        total_earnings: ytdData.total_commission - ytdData.total_commission * 0.15,
      },
    };
  }

  /**
   * Calculate payouts for a period
   */
  async calculatePayouts(
    shopId: string,
    periodStart: Date,
    periodEnd: Date,
    barberId?: string
  ): Promise<CommissionPayout[]> {
    let query = `
      SELECT DISTINCT barber_id FROM commission_transactions
      WHERE shop_id = $1
        AND transaction_date >= $2
        AND transaction_date <= $3
        AND status IN ('completed', 'pending')
    `;

    const params: any[] = [shopId, periodStart, periodEnd];
    if (barberId) {
      query += ` AND barber_id = $4`;
      params.push(barberId);
    }

    const barbersResult = await this.client.query(query, params);
    const barbers = barbersResult.rows;

    const payouts: CommissionPayout[] = [];

    for (const { barber_id } of barbers) {
      // Calculate totals
      const totalsQuery = `
        SELECT
          COALESCE(SUM(base_commission), 0) as total_commission
        FROM commission_transactions
        WHERE shop_id = $1 AND barber_id = $2
          AND transaction_date >= $3 AND transaction_date <= $4
          AND status IN ('completed', 'pending')
      `;

      const totalsResult = await this.client.query(totalsQuery, [shopId, barber_id, periodStart, periodEnd]);
      const totalCommission = parseFloat(totalsResult.rows[0]?.total_commission || 0);

      // Get bonuses
      const bonusesQuery = `
        SELECT COALESCE(SUM(COALESCE(bonus_amount, 0)), 0) as total_bonuses
        FROM commission_bonuses
        WHERE shop_id = $1 AND barber_id = $2
          AND calculation_month >= $3 AND calculation_month <= $4
          AND bonus_status IN ('pending', 'earned')
      `;

      const bonusesResult = await this.client.query(bonusesQuery, [shopId, barber_id, periodStart, periodEnd]);
      const totalBonuses = parseFloat(bonusesResult.rows[0]?.total_bonuses || 0);

      // Get deductions
      const deductionsQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_deductions
        FROM commission_deductions
        WHERE shop_id = $1 AND barber_id = $2
          AND deduction_date >= $3 AND deduction_date <= $4
          AND status != 'reversed'
      `;

      const deductionsResult = await this.client.query(deductionsQuery, [shopId, barber_id, periodStart, periodEnd]);
      const totalDeductions = parseFloat(deductionsResult.rows[0]?.total_deductions || 0);

      const taxWithheld = totalCommission * 0.15; // 15% federal tax
      const netPayout = totalCommission + totalBonuses - totalDeductions - taxWithheld;

      const payoutId = uuidv4();
      const now = new Date();

      const insertQuery = `
        INSERT INTO commission_payouts (
          id, shop_id, barber_id, payout_period_start, payout_period_end,
          total_commission, bonuses, deductions, tax_withheld, net_payout,
          payout_status, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const insertResult = await this.client.query(insertQuery, [
        payoutId,
        shopId,
        barber_id,
        periodStart,
        periodEnd,
        totalCommission,
        totalBonuses,
        totalDeductions,
        taxWithheld,
        Math.max(0, netPayout),
        'pending',
        now,
        now,
        'system',
      ]);

      payouts.push(insertResult.rows[0]);
    }

    return payouts;
  }

  /**
   * Process payout (mark as completed)
   */
  async processPayout(
    shopId: string,
    payoutId: string,
    payoutMethod: string,
    stripePayoutId?: string
  ): Promise<CommissionPayout> {
    const query = `
      UPDATE commission_payouts
      SET payout_status = 'completed',
          payout_method = $3,
          stripe_payout_id = $4,
          payout_date = NOW(),
          updated_at = NOW()
      WHERE shop_id = $1 AND id = $2
      RETURNING *
    `;

    const result = await this.client.query(query, [shopId, payoutId, payoutMethod, stripePayoutId || null]);
    return result.rows[0];
  }

  /**
   * Get commission dashboard data
   */
  async getDashboardData(shopId: string, month: Date): Promise<CommissionDashboardData> {
    const monthStart = this.getMonthStart(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Get all barbers' commission summaries
    const summariesQuery = `
      SELECT
        bt.barber_id,
        COUNT(DISTINCT bt.appointment_id) as appointments,
        COALESCE(SUM(bt.service_price), 0) as total_revenue,
        COALESCE(SUM(bt.base_commission), 0) as total_commission,
        (SELECT COALESCE(SUM(COALESCE(bonus_amount, 0)), 0)
         FROM commission_bonuses cb
         WHERE cb.shop_id = bt.shop_id AND cb.barber_id = bt.barber_id
         AND cb.calculation_month = $3) as bonuses,
        (SELECT COALESCE(SUM(amount), 0)
         FROM commission_deductions cd
         WHERE cd.shop_id = bt.shop_id AND cd.barber_id = bt.barber_id
         AND cd.deduction_date >= $2 AND cd.deduction_date < $4
         AND cd.status != 'reversed') as deductions
      FROM commission_transactions bt
      WHERE bt.shop_id = $1
        AND bt.transaction_date >= $2
        AND bt.transaction_date < $4
        AND bt.status IN ('completed', 'pending')
      GROUP BY bt.barber_id
      ORDER BY total_commission DESC
    `;

    const summariesResult = await this.client.query(summariesQuery, [shopId, monthStart, monthStart, monthEnd]);

    const barber_summaries: BarberCommissionSummary[] = summariesResult.rows.map((row, index) => ({
      barber_id: row.barber_id,
      barber_name: `Barber ${row.barber_id.substring(0, 8)}`, // Placeholder
      appointments: row.appointments,
      total_revenue: parseFloat(row.total_revenue),
      total_commission: parseFloat(row.total_commission),
      bonuses: parseFloat(row.bonuses || 0),
      deductions: parseFloat(row.deductions || 0),
      tax_withheld: parseFloat(row.total_commission) * 0.15,
      net_earnings: parseFloat(row.total_commission) + parseFloat(row.bonuses || 0) - parseFloat(row.deductions || 0) - parseFloat(row.total_commission) * 0.15,
      commission_rate: 0, // Would be calculated from rate
      performance_rank: index + 1,
    }));

    // Calculate shop totals
    const shop_totals = {
      total_barbers: barber_summaries.length,
      total_appointments: barber_summaries.reduce((sum, b) => sum + b.appointments, 0),
      total_revenue: barber_summaries.reduce((sum, b) => sum + b.total_revenue, 0),
      total_commission: barber_summaries.reduce((sum, b) => sum + b.total_commission, 0),
      total_bonuses: barber_summaries.reduce((sum, b) => sum + b.bonuses, 0),
      total_deductions: barber_summaries.reduce((sum, b) => sum + b.deductions, 0),
      total_tax_withheld: barber_summaries.reduce((sum, b) => sum + b.tax_withheld, 0),
      total_earnings: barber_summaries.reduce((sum, b) => sum + b.net_earnings, 0),
      commission_expense_percentage: 0,
    };

    shop_totals.commission_expense_percentage = 
      shop_totals.total_revenue > 0 
        ? (shop_totals.total_commission / shop_totals.total_revenue) * 100 
        : 0;

    return {
      shop_id: shopId,
      month: monthStart,
      barber_summaries,
      shop_totals,
      top_earners: barber_summaries.slice(0, 5),
    };
  }

  /**
   * Helper: Get first day of month
   */
  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
