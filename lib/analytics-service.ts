import { query, getClient } from './db';

/**
 * Analytics Service
 * Provides comprehensive analytics queries for the barbershop dashboard
 * Supports revenue, appointment metrics, barber performance, and customer trends
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface RevenueSummary {
  totalRevenue: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  byService: Array<{ service: string; revenue: number; count: number }>;
  byBarber: Array<{ barberId: number; barberName: string; revenue: number }>;
}

export interface AppointmentMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface PeakTimesHeatmap {
  hourOfDay: number;
  dayOfWeek: number;
  dayName: string;
  hourLabel: string;
  appointments: number;
}

export interface BarberPerformance {
  barberId: number;
  barberName: string;
  appointmentsTotal: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  completionRate: number;
}

export interface CustomerAcquisitionTrends {
  date: string;
  newCustomers: number;
  returningCustomers: number;
  totalAppointments: number;
}

export interface AnalyticsDashboard {
  revenue: RevenueSummary;
  appointments: AppointmentMetrics;
  peakTimes: PeakTimesHeatmap[];
  barberPerformance: BarberPerformance[];
  customerAcquisition: CustomerAcquisitionTrends[];
  dateRange: DateRange;
}

/**
 * Get date range based on string input
 * @param rangeString - '7d', '30d', or '90d'
 * @returns DateRange object
 */
export function getDateRange(rangeString: string = '30d'): DateRange {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);

  if (rangeString === '7d') {
    startDate.setDate(startDate.getDate() - 7);
  } else if (rangeString === '30d') {
    startDate.setDate(startDate.getDate() - 30);
  } else if (rangeString === '90d') {
    startDate.setDate(startDate.getDate() - 90);
  } else {
    // Default to 30 days
    startDate.setDate(startDate.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Get total revenue and daily breakdown
 */
export async function getRevenueSummary(
  shopId: number,
  dateRange: DateRange
): Promise<RevenueSummary> {
  const { startDate, endDate } = dateRange;

  // Total revenue and daily breakdown
  const dailyResult = await query<{
    date: string;
    revenue: number;
  }>(
    `
    SELECT 
      DATE(a.start_time) as date,
      COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as revenue
    FROM appointments a
    LEFT JOIN payments p ON a.id = p.appointment_id
    WHERE a.shop_id = $1 
      AND a.status IN ('completed', 'confirmed')
      AND a.start_time >= $2 
      AND a.start_time <= $3
    GROUP BY DATE(a.start_time)
    ORDER BY date ASC
    `,
    [shopId, startDate, endDate]
  );

  // Revenue by service
  const byServiceResult = await query<{
    service: string;
    revenue: number;
    count: number;
  }>(
    `
    SELECT 
      COALESCE(a.service_name, s.name, 'Unknown') as service,
      COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as revenue,
      COUNT(a.id) as count
    FROM appointments a
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN payments p ON a.id = p.appointment_id
    WHERE a.shop_id = $1 
      AND a.status IN ('completed', 'confirmed')
      AND a.start_time >= $2 
      AND a.start_time <= $3
    GROUP BY COALESCE(a.service_name, s.name, 'Unknown')
    ORDER BY revenue DESC
    `,
    [shopId, startDate, endDate]
  );

  // Revenue by barber
  const byBarberResult = await query<{
    barberId: number;
    barberName: string;
    revenue: number;
  }>(
    `
    SELECT 
      u.id as "barberId",
      u.name as "barberName",
      COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as revenue
    FROM appointments a
    LEFT JOIN users u ON a.barber_id = u.id
    LEFT JOIN payments p ON a.id = p.appointment_id
    WHERE a.shop_id = $1 
      AND a.status IN ('completed', 'confirmed')
      AND a.start_time >= $2 
      AND a.start_time <= $3
    GROUP BY u.id, u.name
    ORDER BY revenue DESC
    `,
    [shopId, startDate, endDate]
  );

  const totalRevenue = dailyResult.rows.reduce((sum, row) => sum + (row.revenue || 0), 0);

  return {
    totalRevenue,
    dailyRevenue: dailyResult.rows.map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      revenue: row.revenue || 0,
    })),
    byService: byServiceResult.rows.map((row) => ({
      service: row.service,
      revenue: row.revenue || 0,
      count: row.count || 0,
    })),
    byBarber: byBarberResult.rows.map((row) => ({
      barberId: row.barberId,
      barberName: row.barberName,
      revenue: row.revenue || 0,
    })),
  };
}

/**
 * Get appointment metrics (completion rates, cancellation rates, no-show rates)
 */
export async function getAppointmentMetrics(
  shopId: number,
  dateRange: DateRange
): Promise<AppointmentMetrics> {
  const { startDate, endDate } = dateRange;

  const result = await query<{
    total: number;
    completed: number;
    cancelled: number;
    noshow: number;
  }>(
    `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN status = 'no-show' THEN 1 END) as noshow
    FROM appointments
    WHERE shop_id = $1 
      AND start_time >= $2 
      AND start_time <= $3
    `,
    [shopId, startDate, endDate]
  );

  const { total = 0, completed = 0, cancelled = 0, noshow = 0 } = result.rows[0] || {};

  return {
    total,
    completed,
    cancelled,
    noShow: noshow,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    noShowRate: total > 0 ? Math.round((noshow / total) * 100) : 0,
  };
}

/**
 * Get peak times heatmap data (by hour and day of week)
 */
export async function getPeakTimesHeatmap(
  shopId: number,
  dateRange: DateRange
): Promise<PeakTimesHeatmap[]> {
  const { startDate, endDate } = dateRange;

  const result = await query<{
    hour: number;
    day_of_week: number;
    day_name: string;
    appointments: number;
  }>(
    `
    SELECT 
      EXTRACT(HOUR FROM a.start_time)::int as hour,
      EXTRACT(DOW FROM a.start_time)::int as day_of_week,
      TO_CHAR(a.start_time, 'Day') as day_name,
      COUNT(*) as appointments
    FROM appointments a
    WHERE a.shop_id = $1 
      AND a.status IN ('completed', 'confirmed')
      AND a.start_time >= $2 
      AND a.start_time <= $3
    GROUP BY 
      EXTRACT(HOUR FROM a.start_time),
      EXTRACT(DOW FROM a.start_time),
      TO_CHAR(a.start_time, 'Day')
    ORDER BY day_of_week ASC, hour ASC
    `,
    [shopId, startDate, endDate]
  );

  return result.rows.map((row) => ({
    hourOfDay: row.hour || 0,
    dayOfWeek: row.day_of_week || 0,
    dayName: row.day_name.trim(),
    hourLabel: `${String(row.hour || 0).padStart(2, '0')}:00`,
    appointments: row.appointments || 0,
  }));
}

/**
 * Get barber performance metrics
 */
export async function getBarberPerformance(
  shopId: number,
  dateRange: DateRange
): Promise<BarberPerformance[]> {
  const { startDate, endDate } = dateRange;

  const result = await query<{
    barberId: number;
    barberName: string;
    appointmentsTotal: number;
    appointmentsCompleted: number;
    appointmentsCancelled: number;
    appointmentsNoShow: number;
    revenue: number;
    averageRating: number;
    reviewCount: number;
  }>(
    `
    SELECT 
      u.id as "barberId",
      u.name as "barberName",
      COUNT(a.id) as "appointmentsTotal",
      COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as "appointmentsCompleted",
      COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as "appointmentsCancelled",
      COUNT(CASE WHEN a.status = 'no-show' THEN 1 END) as "appointmentsNoShow",
      COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as revenue,
      COALESCE(AVG(r.rating), 0)::numeric(3,2) as "averageRating",
      COUNT(r.id) as "reviewCount"
    FROM users u
    LEFT JOIN appointments a ON u.id = a.barber_id 
      AND a.shop_id = $1
      AND a.start_time >= $2 
      AND a.start_time <= $3
    LEFT JOIN payments p ON a.id = p.appointment_id
    LEFT JOIN reviews r ON a.id = r.appointment_id
    WHERE u.shop_id = $1 AND u.role = 'barber'
    GROUP BY u.id, u.name
    ORDER BY "appointmentsTotal" DESC
    `,
    [shopId, startDate, endDate]
  );

  return result.rows.map((row) => {
    const appointmentsTotal = row.appointmentsTotal || 0;
    const appointmentsCompleted = row.appointmentsCompleted || 0;
    const completionRate = appointmentsTotal > 0 ? Math.round((appointmentsCompleted / appointmentsTotal) * 100) : 0;

    return {
      barberId: row.barberId,
      barberName: row.barberName,
      appointmentsTotal,
      appointmentsCompleted,
      appointmentsCancelled: row.appointmentsCancelled || 0,
      appointmentsNoShow: row.appointmentsNoShow || 0,
      revenue: row.revenue || 0,
      averageRating: Number(row.averageRating) || 0,
      reviewCount: row.reviewCount || 0,
      completionRate,
    };
  });
}

/**
 * Get customer acquisition trends
 */
export async function getCustomerAcquisitionTrends(
  shopId: number,
  dateRange: DateRange
): Promise<CustomerAcquisitionTrends[]> {
  const { startDate, endDate } = dateRange;

  const result = await query<{
    date: string;
    newCustomers: number;
    returningCustomers: number;
    totalAppointments: number;
  }>(
    `
    SELECT 
      DATE(a.start_time) as date,
      COUNT(DISTINCT CASE WHEN a.customer_id IS NOT NULL AND cp.created_at::date = DATE(a.start_time) THEN a.customer_id END) as "newCustomers",
      COUNT(DISTINCT CASE WHEN a.customer_id IS NOT NULL AND cp.created_at::date < DATE(a.start_time) THEN a.customer_id END) as "returningCustomers",
      COUNT(a.id) as "totalAppointments"
    FROM appointments a
    LEFT JOIN customer_profiles cp ON a.customer_id = cp.id
    WHERE a.shop_id = $1 
      AND a.status IN ('completed', 'confirmed')
      AND a.start_time >= $2 
      AND a.start_time <= $3
    GROUP BY DATE(a.start_time)
    ORDER BY date ASC
    `,
    [shopId, startDate, endDate]
  );

  return result.rows.map((row) => ({
    date: new Date(row.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    newCustomers: row.newCustomers || 0,
    returningCustomers: row.returningCustomers || 0,
    totalAppointments: row.totalAppointments || 0,
  }));
}

/**
 * Get complete analytics dashboard data
 */
export async function getAnalyticsDashboard(
  shopId: number,
  dateRangeString: string = '30d'
): Promise<AnalyticsDashboard> {
  // Validate date range parameter
  if (!['7d', '30d', '90d'].includes(dateRangeString)) {
    throw new Error("Invalid date range. Use '7d', '30d', or '90d'");
  }

  const dateRange = getDateRange(dateRangeString);

  // Fetch all analytics data in parallel
  const [revenue, appointments, peakTimes, barberPerformance, customerAcquisition] = await Promise.all([
    getRevenueSummary(shopId, dateRange),
    getAppointmentMetrics(shopId, dateRange),
    getPeakTimesHeatmap(shopId, dateRange),
    getBarberPerformance(shopId, dateRange),
    getCustomerAcquisitionTrends(shopId, dateRange),
  ]);

  return {
    revenue,
    appointments,
    peakTimes,
    barberPerformance,
    customerAcquisition,
    dateRange,
  };
}
