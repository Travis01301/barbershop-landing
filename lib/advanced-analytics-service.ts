import { query, getClient } from './db';
import { logger } from './logger';

const log = logger.createChild('advanced-analytics-service');

export interface BarberPerformance {
  shopId: number;
  barberId: number;
  barberName: string;
  metricDate: string;
  totalRevenue: number;
  appointmentCount: number;
  averageTransaction: number;
  repeatCustomerCount: number;
  newCustomerCount: number;
  customerSatisfactionScore?: number;
}

export interface CustomerLTV {
  customerId: number;
  customerName: string;
  totalSpent: number;
  appointmentCount: number;
  averageVisitFrequency: number;
  lastVisitDate?: string;
  firstVisitDate?: string;
  lifetimeValueCategory: 'vip' | 'high-value' | 'regular' | 'at-risk' | 'inactive';
  predictedChurnRisk: number;
}

export interface ChurnSignal {
  customerId: number;
  customerName: string;
  daysSinceVisit: number;
  churnProbability: number;
  churnScore: number;
  reasons: string[];
  recommendedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface CohortAnalysis {
  shopId: number;
  cohortMonth: string;
  cohortName: string;
  cohortSize: number;
  acquisitionMonthRevenue: number;
  month0Count: number;
  month0Revenue: number;
  month1Count: number;
  month1Revenue: number;
  month3Count?: number;
  month3Revenue?: number;
  month6Count?: number;
  month6Revenue?: number;
  retentionRateMonth1?: number;
  retentionRateMonth3?: number;
  retentionRateMonth6?: number;
}

export interface DemandForecast {
  shopId: number;
  serviceId?: number;
  forecastDate: string;
  dayOfWeek: number;
  hourOfDay: number;
  expectedDemand: number;
  confidenceLevel: number;
  peakHour: boolean;
  recommendedStaffCount: number;
}

/**
 * Calculate and cache barber performance metrics
 */
export async function calculateBarberPerformance(
  shopId: number,
  barberId?: number,
  dateRange?: { startDate: string; endDate: string }
): Promise<BarberPerformance[]> {
  try {
    let sql = `
      SELECT 
        a.shop_id,
        u.id as barber_id,
        u.name as barber_name,
        DATE(a.start_time) as metric_date,
        COUNT(*) as appointment_count,
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) as total_revenue,
        COALESCE(AVG(CAST(p.amount AS DECIMAL)), 0) as average_transaction,
        COUNT(CASE WHEN cp.id IS NOT NULL THEN 1 END) as repeat_customer_count,
        COUNT(DISTINCT CASE WHEN cp.id IS NULL THEN a.customer_id END) as new_customer_count
      FROM appointments a
      LEFT JOIN payments p ON a.id = p.appointment_id
      LEFT JOIN customer_profiles cp ON a.customer_id = cp.id
      LEFT JOIN users u ON a.barber_id = u.id
      WHERE a.shop_id = $1
        AND a.status = 'completed'
    `;

    const params: any[] = [shopId];

    if (barberId) {
      sql += ` AND a.barber_id = $${params.length + 1}`;
      params.push(barberId);
    }

    if (dateRange) {
      sql += ` AND DATE(a.start_time) >= $${params.length + 1} AND DATE(a.start_time) <= $${params.length + 2}`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += ` GROUP BY a.shop_id, u.id, u.name, DATE(a.start_time)
             ORDER BY metric_date DESC, total_revenue DESC`;

    const result = await query<any>(sql, params);

    return result.rows.map((row) => ({
      shopId: row.shop_id,
      barberId: row.barber_id,
      barberName: row.barber_name,
      metricDate: row.metric_date,
      totalRevenue: parseFloat(row.total_revenue),
      appointmentCount: row.appointment_count,
      averageTransaction: parseFloat(row.average_transaction),
      repeatCustomerCount: row.repeat_customer_count,
      newCustomerCount: row.new_customer_count,
    }));
  } catch (err) {
    log.error('Failed to calculate barber performance', err);
    throw err;
  }
}

/**
 * Calculate customer lifetime value
 */
export async function calculateCustomerLTV(
  shopId: number,
  customerId?: number
): Promise<CustomerLTV[]> {
  try {
    let sql = `
      SELECT 
        cp.id as customer_id,
        cp.name as customer_name,
        COUNT(a.id) as appointment_count,
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) as total_spent,
        MAX(a.start_time) as last_visit_date,
        MIN(a.start_time) as first_visit_date,
        COUNT(a.id)::DECIMAL / 
          GREATEST(1, EXTRACT(MONTH FROM AGE(NOW(), MIN(a.start_time))) + 1) as avg_visit_frequency
      FROM customer_profiles cp
      LEFT JOIN appointments a ON cp.id = a.customer_id AND a.status = 'completed'
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE cp.shop_id = $1
    `;

    const params: any[] = [shopId];

    if (customerId) {
      sql += ` AND cp.id = $${params.length + 1}`;
      params.push(customerId);
    }

    sql += ` GROUP BY cp.id, cp.name`;

    const result = await query<any>(sql, params);

    return result.rows.map((row) => {
      const totalSpent = parseFloat(row.total_spent);
      let category: 'vip' | 'high-value' | 'regular' | 'at-risk' | 'inactive' = 'regular';

      if (totalSpent > 500) {
        category = 'vip';
      } else if (totalSpent > 250) {
        category = 'high-value';
      } else if (row.appointment_count === 0) {
        category = 'inactive';
      } else if (row.appointment_count === 1) {
        category = 'at-risk';
      }

      return {
        customerId: row.customer_id,
        customerName: row.customer_name,
        totalSpent,
        appointmentCount: row.appointment_count || 0,
        averageVisitFrequency: parseFloat(row.avg_visit_frequency) || 0,
        lastVisitDate: row.last_visit_date,
        firstVisitDate: row.first_visit_date,
        lifetimeValueCategory: category,
        predictedChurnRisk: predictChurnRisk(row),
      };
    });
  } catch (err) {
    log.error('Failed to calculate customer LTV', err);
    throw err;
  }
}

/**
 * Detect churn signals for customers
 */
export async function detectChurnSignals(
  shopId: number,
  daysWithoutVisit: number = 60
): Promise<ChurnSignal[]> {
  try {
    const result = await query<any>(
      `
      SELECT 
        cp.id as customer_id,
        cp.name as customer_name,
        EXTRACT(DAY FROM NOW() - MAX(a.start_time)) as days_since_visit,
        COUNT(a.id) as total_appointments,
        MAX(a.start_time) as last_visit_date
      FROM customer_profiles cp
      LEFT JOIN appointments a ON cp.id = a.customer_id AND a.status = 'completed'
      WHERE cp.shop_id = $1
      GROUP BY cp.id, cp.name
      HAVING MAX(a.start_time) IS NULL OR EXTRACT(DAY FROM NOW() - MAX(a.start_time)) > $2
      ORDER BY days_since_visit DESC
      `,
      [shopId, daysWithoutVisit]
    );

    return result.rows.map((row) => {
      const daysSince = parseInt(row.days_since_visit) || 999;
      const churnScore = Math.min(100, Math.max(0, (daysSince / daysWithoutVisit) * 100));

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (churnScore > 80) riskLevel = 'critical';
      else if (churnScore > 60) riskLevel = 'high';
      else if (churnScore > 40) riskLevel = 'medium';

      return {
        customerId: row.customer_id,
        customerName: row.customer_name,
        daysSinceVisit: daysSince,
        churnProbability: Math.min(1, churnScore / 100),
        churnScore: Math.round(churnScore),
        reasons: [
          `No visit in ${daysSince} days`,
          row.total_appointments === 1 ? 'Only one appointment on record' : '',
        ].filter(Boolean),
        recommendedActions: [
          'Send promotional offer',
          'Personalized outreach call',
          'Email campaign about new services',
        ],
        riskLevel,
      };
    });
  } catch (err) {
    log.error('Failed to detect churn signals', err);
    throw err;
  }
}

/**
 * Perform cohort analysis
 */
export async function analyzeCohorts(
  shopId: number,
  cohortMonth?: string
): Promise<CohortAnalysis[]> {
  try {
    let sql = `
      SELECT 
        DATE_TRUNC('month', MIN(a.start_time))::DATE as cohort_month,
        COUNT(DISTINCT cp.id) as cohort_size,
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) as acquisition_month_revenue
      FROM customer_profiles cp
      LEFT JOIN appointments a ON cp.id = a.customer_id AND a.status = 'completed'
      LEFT JOIN payments p ON a.id = p.appointment_id
      WHERE cp.shop_id = $1
    `;

    const params: any[] = [shopId];

    if (cohortMonth) {
      sql += ` AND DATE_TRUNC('month', MIN(a.start_time))::DATE = $${params.length + 1}`;
      params.push(cohortMonth);
    }

    sql += ` GROUP BY cohort_month
             ORDER BY cohort_month DESC`;

    const result = await query<any>(sql, params);

    return result.rows.map((row) => ({
      shopId,
      cohortMonth: row.cohort_month,
      cohortName: `${new Date(row.cohort_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} Cohort`,
      cohortSize: row.cohort_size || 0,
      acquisitionMonthRevenue: parseFloat(row.acquisition_month_revenue) || 0,
      month0Count: row.cohort_size || 0,
      month0Revenue: parseFloat(row.acquisition_month_revenue) || 0,
      month1Count: 0, // Would be calculated from actual appointment dates
      month1Revenue: 0,
    }));
  } catch (err) {
    log.error('Failed to analyze cohorts', err);
    throw err;
  }
}

/**
 * Forecast demand for services
 */
export async function forecastDemand(
  shopId: number,
  daysAhead: number = 7
): Promise<DemandForecast[]> {
  try {
    // Get historical demand patterns
    const historicalData = await query<any>(
      `
      SELECT 
        EXTRACT(DOW FROM a.start_time)::INT as day_of_week,
        EXTRACT(HOUR FROM a.start_time)::INT as hour_of_day,
        a.service_id,
        COUNT(*) as booking_count
      FROM appointments a
      WHERE a.shop_id = $1
        AND a.status = 'completed'
        AND a.start_time >= NOW() - INTERVAL '90 days'
      GROUP BY EXTRACT(DOW FROM a.start_time), EXTRACT(HOUR FROM a.start_time), a.service_id
      `,
      [shopId]
    );

    const forecasts: DemandForecast[] = [];
    const now = new Date();

    // Generate forecasts for the specified period
    for (let d = 0; d < daysAhead; d++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + d);
      const dayOfWeek = forecastDate.getDay();

      // For each hour of the day
      for (let hour = 8; hour < 18; hour++) {
        const historicalHour = historicalData.rows.filter(
          (row) => row.day_of_week === dayOfWeek && row.hour_of_day === hour
        );

        const avgDemand =
          historicalHour.length > 0
            ? Math.round(
                historicalHour.reduce((sum, row) => sum + row.booking_count, 0) / historicalHour.length
              )
            : 2;

        const isPeak = avgDemand > 5;

        forecasts.push({
          shopId,
          serviceId: undefined,
          forecastDate: forecastDate.toISOString().split('T')[0],
          dayOfWeek,
          hourOfDay: hour,
          expectedDemand: avgDemand,
          confidenceLevel: 0.85,
          peakHour: isPeak,
          recommendedStaffCount: isPeak ? 3 : 2,
        });
      }
    }

    return forecasts;
  } catch (err) {
    log.error('Failed to forecast demand', err);
    throw err;
  }
}

/**
 * Get service popularity and margins
 */
export async function analyzeServicePopularity(
  shopId: number,
  dateRange?: { startDate: string; endDate: string }
): Promise<any[]> {
  try {
    let sql = `
      SELECT 
        bs.id as service_id,
        bs.name as service_name,
        bs.base_price,
        COUNT(a.id) as total_bookings,
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) as total_revenue,
        COALESCE(AVG(CAST(p.amount AS DECIMAL)), 0) as average_price,
        COALESCE(SUM(CAST(ii.quantity * ii.unit_cost AS DECIMAL)), 0) as total_cost,
        COALESCE(SUM(CAST(p.amount AS DECIMAL)), 0) - COALESCE(SUM(CAST(ii.quantity * ii.unit_cost AS DECIMAL)), 0) as gross_margin
      FROM barber_services bs
      LEFT JOIN appointments a ON bs.id = a.service_id AND a.shop_id = $1 AND a.status = 'completed'
      LEFT JOIN payments p ON a.id = p.appointment_id
      LEFT JOIN inventory_items ii ON a.id = ii.appointment_id
      WHERE bs.shop_id = $1
    `;

    const params: any[] = [shopId];

    if (dateRange) {
      sql += ` AND a.start_time >= $${params.length + 1} AND a.start_time <= $${params.length + 2}`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += ` GROUP BY bs.id, bs.name, bs.base_price
             ORDER BY total_revenue DESC`;

    const result = await query<any>(sql, params);

    return result.rows.map((row) => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      basePrice: parseFloat(row.base_price),
      totalBookings: row.total_bookings || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      averagePrice: parseFloat(row.average_price) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      grossMargin: parseFloat(row.gross_margin) || 0,
      marginPercentage: row.total_revenue > 0 ? ((row.gross_margin / row.total_revenue) * 100).toFixed(2) : 0,
    }));
  } catch (err) {
    log.error('Failed to analyze service popularity', err);
    throw err;
  }
}

/**
 * Get customer segments
 */
export async function segmentCustomers(shopId: number): Promise<any[]> {
  try {
    const customers = await calculateCustomerLTV(shopId);
    return customers.map((customer) => ({
      ...customer,
      segmentType: customer.lifetimeValueCategory,
      segmentScore: calculateSegmentScore(customer),
      recommendedActions: getRecommendedActions(customer.lifetimeValueCategory),
    }));
  } catch (err) {
    log.error('Failed to segment customers', err);
    throw err;
  }
}

/**
 * Helper function to predict churn risk
 */
function predictChurnRisk(row: any): number {
  const daysSinceVisit = row.last_visit_date
    ? (Date.now() - new Date(row.last_visit_date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const appointmentCount = row.appointment_count || 0;
  const visitFrequency = parseFloat(row.avg_visit_frequency) || 0;

  // Calculate risk score (0-1)
  let risk = 0;

  // Risk increases with days since visit
  risk += Math.min(1, daysSinceVisit / 180);

  // Risk is high if very few appointments
  if (appointmentCount === 1) risk += 0.3;
  else if (appointmentCount < 3) risk += 0.15;

  // Risk is high if low frequency
  if (visitFrequency < 0.5) risk += 0.2;

  return Math.min(1, risk / 2);
}

/**
 * Helper function to calculate segment score
 */
function calculateSegmentScore(customer: CustomerLTV): number {
  let score = 0;

  // Base score from spending
  score += Math.min(100, (customer.totalSpent / 500) * 50);

  // Frequency bonus
  score += Math.min(50, customer.averageVisitFrequency * 25);

  // Reduce score by churn risk
  score -= customer.predictedChurnRisk * 30;

  return Math.max(0, Math.min(100, score));
}

/**
 * Helper function to get recommended actions for customer segment
 */
function getRecommendedActions(segment: string): string[] {
  const actions: Record<string, string[]> = {
    vip: [
      'Exclusive loyalty program',
      'Premium service offers',
      'VIP event invitations',
      'Personalized follow-ups',
    ],
    'high-value': [
      'Upsell premium services',
      'Loyalty rewards program',
      'Regular check-ins',
      'Exclusive discounts',
    ],
    regular: [
      'Standard loyalty program',
      'Seasonal promotions',
      'Service recommendations',
      'Regular newsletters',
    ],
    'at-risk': [
      'Win-back campaign',
      'Special discount offer',
      'Feedback survey',
      'Personalized incentive',
    ],
    inactive: [
      'Re-engagement campaign',
      'Limited-time offer',
      'Survey about preferences',
      'Social media retargeting',
    ],
  };

  return actions[segment] || [];
}

export default {
  calculateBarberPerformance,
  calculateCustomerLTV,
  detectChurnSignals,
  analyzeCohorts,
  forecastDemand,
  analyzeServicePopularity,
  segmentCustomers,
};
