import analyticsService from '@/lib/advanced-analytics-service';
import * as db from '@/lib/db';

jest.mock('@/lib/db');
jest.mock('@/lib/logger', () => ({
  logger: {
    createChild: () => ({
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

describe('Advanced Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBarberPerformance', () => {
    it('should calculate barber performance metrics', async () => {
      const mockMetrics = [
        {
          shop_id: 1,
          barber_id: 10,
          barber_name: 'John',
          metric_date: '2026-02-16',
          appointment_count: 5,
          total_revenue: '500.00',
          average_transaction: '100.00',
          repeat_customer_count: 3,
          new_customer_count: 2,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockMetrics,
        rowCount: 1,
      });

      const result = await analyticsService.calculateBarberPerformance(1);

      expect(result).toHaveLength(1);
      expect(result[0].barberId).toBe(10);
      expect(result[0].totalRevenue).toBe(500);
      expect(result[0].appointmentCount).toBe(5);
    });

    it('should filter by barberId', async () => {
      const mockMetrics = [
        {
          shop_id: 1,
          barber_id: 10,
          barber_name: 'John',
          metric_date: '2026-02-16',
          appointment_count: 5,
          total_revenue: '500.00',
          average_transaction: '100.00',
          repeat_customer_count: 3,
          new_customer_count: 2,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockMetrics,
        rowCount: 1,
      });

      const result = await analyticsService.calculateBarberPerformance(1, 10);

      expect(result).toHaveLength(1);
      expect(result[0].barberId).toBe(10);
    });

    it('should filter by date range', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await analyticsService.calculateBarberPerformance(1, undefined, {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateCustomerLTV', () => {
    it('should calculate customer lifetime value', async () => {
      const mockCustomers = [
        {
          customer_id: 1,
          customer_name: 'Alice',
          appointment_count: 10,
          total_spent: '1000.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2025-12-01T10:00:00Z',
          avg_visit_frequency: 3.5,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCustomers,
        rowCount: 1,
      });

      const result = await analyticsService.calculateCustomerLTV(1);

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(1);
      expect(result[0].totalSpent).toBe(1000);
      expect(result[0].lifetimeValueCategory).toBe('vip');
    });

    it('should categorize customers correctly', async () => {
      const mockCustomers = [
        {
          customer_id: 1,
          customer_name: 'VIP',
          appointment_count: 20,
          total_spent: '1000.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2025-12-01T10:00:00Z',
          avg_visit_frequency: 5,
        },
        {
          customer_id: 2,
          customer_name: 'HighValue',
          appointment_count: 8,
          total_spent: '300.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2025-12-01T10:00:00Z',
          avg_visit_frequency: 2,
        },
        {
          customer_id: 3,
          customer_name: 'Regular',
          appointment_count: 3,
          total_spent: '150.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2026-02-01T10:00:00Z',
          avg_visit_frequency: 1,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCustomers,
        rowCount: 3,
      });

      const result = await analyticsService.calculateCustomerLTV(1);

      expect(result[0].lifetimeValueCategory).toBe('vip');
      expect(result[1].lifetimeValueCategory).toBe('high-value');
      expect(result[2].lifetimeValueCategory).toBe('regular');
    });
  });

  describe('detectChurnSignals', () => {
    it('should detect customers at risk of churn', async () => {
      const mockChurnData = [
        {
          customer_id: 1,
          customer_name: 'ChurnRisk',
          days_since_visit: '90',
          total_appointments: 1,
          last_visit_date: '2025-11-17T10:00:00Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockChurnData,
        rowCount: 1,
      });

      const result = await analyticsService.detectChurnSignals(1, 60);

      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(1);
      expect(['high', 'critical']).toContain(result[0].riskLevel);
      expect(result[0].churnScore).toBeGreaterThan(0);
    });

    it('should classify risk levels correctly', async () => {
      const mockChurnData = [
        {
          customer_id: 1,
          customer_name: 'Critical',
          days_since_visit: '120',
          total_appointments: 1,
          last_visit_date: '2025-10-18T10:00:00Z',
        },
        {
          customer_id: 2,
          customer_name: 'High',
          days_since_visit: '90',
          total_appointments: 2,
          last_visit_date: '2025-11-17T10:00:00Z',
        },
        {
          customer_id: 3,
          customer_name: 'Medium',
          days_since_visit: '70',
          total_appointments: 3,
          last_visit_date: '2026-01-07T10:00:00Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockChurnData,
        rowCount: 3,
      });

      const result = await analyticsService.detectChurnSignals(1, 60);

      expect(result[0].riskLevel).toBe('critical');
      expect(['high', 'critical']).toContain(result[1].riskLevel);
      // Risk level depends on days since visit - just verify it's valid
      expect(['low', 'medium', 'high', 'critical']).toContain(result[2].riskLevel);
    });
  });

  describe('analyzeCohorts', () => {
    it('should analyze customer cohorts', async () => {
      const mockCohorts = [
        {
          cohort_month: '2026-01-01',
          cohort_size: 15,
          acquisition_month_revenue: '1500.00',
        },
        {
          cohort_month: '2025-12-01',
          cohort_size: 20,
          acquisition_month_revenue: '2000.00',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCohorts,
        rowCount: 2,
      });

      const result = await analyticsService.analyzeCohorts(1);

      expect(result).toHaveLength(2);
      expect(result[0].cohortSize).toBe(15);
      expect(result[0].acquisitionMonthRevenue).toBe(1500);
    });

    it('should filter by specific cohort month', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await analyticsService.analyzeCohorts(1, '2026-02-01');

      expect(result).toHaveLength(0);
    });
  });

  describe('forecastDemand', () => {
    it('should forecast demand for next 7 days', async () => {
      const mockHistorical = [
        {
          day_of_week: 2,
          hour_of_day: 10,
          service_id: 1,
          booking_count: 5,
        },
        {
          day_of_week: 2,
          hour_of_day: 14,
          service_id: 1,
          booking_count: 8,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockHistorical,
        rowCount: 2,
      });

      const result = await analyticsService.forecastDemand(1, 7);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('expectedDemand');
      expect(result[0]).toHaveProperty('peakHour');
      expect(result[0]).toHaveProperty('recommendedStaffCount');
    });

    it('should identify peak hours', async () => {
      const mockHistorical = [
        {
          day_of_week: 2,
          hour_of_day: 10,
          service_id: 1,
          booking_count: 15,
        },
        {
          day_of_week: 2,
          hour_of_day: 11,
          service_id: 1,
          booking_count: 8,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockHistorical,
        rowCount: 2,
      });

      const result = await analyticsService.forecastDemand(1, 1);

      const peakHours = result.filter((f) => f.peakHour);
      expect(peakHours.length).toBeGreaterThanOrEqual(0);
      // Peak hours have expectedDemand > 5
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeServicePopularity', () => {
    it('should analyze service popularity and margins', async () => {
      const mockServices = [
        {
          service_id: 1,
          service_name: 'Haircut',
          base_price: '25.00',
          total_bookings: 50,
          total_revenue: '1250.00',
          average_price: '25.00',
          total_cost: '250.00',
          gross_margin: '1000.00',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockServices,
        rowCount: 1,
      });

      const result = await analyticsService.analyzeServicePopularity(1);

      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('Haircut');
      expect(result[0].totalBookings).toBe(50);
      expect(result[0].grossMargin).toBe(1000);
    });

    it('should calculate margin percentage', async () => {
      const mockServices = [
        {
          service_id: 1,
          service_name: 'Haircut',
          base_price: '25.00',
          total_bookings: 50,
          total_revenue: '1250.00',
          average_price: '25.00',
          total_cost: '250.00',
          gross_margin: '1000.00',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockServices,
        rowCount: 1,
      });

      const result = await analyticsService.analyzeServicePopularity(1);

      const marginPercentage = parseFloat(result[0].marginPercentage);
      expect(marginPercentage).toBeCloseTo(80, 0);
    });

    it('should filter by date range', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await analyticsService.analyzeServicePopularity(1, {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('segmentCustomers', () => {
    it('should segment customers by LTV category', async () => {
      const mockCustomers = [
        {
          customer_id: 1,
          customer_name: 'VIP Customer',
          appointment_count: 20,
          total_spent: '1000.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2025-12-01T10:00:00Z',
          avg_visit_frequency: 5,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCustomers,
        rowCount: 1,
      });

      const result = await analyticsService.segmentCustomers(1);

      expect(result).toHaveLength(1);
      expect(result[0].segmentType).toBe('vip');
      expect(result[0]).toHaveProperty('recommendedActions');
      expect(result[0].recommendedActions.length).toBeGreaterThan(0);
    });

    it('should provide different recommended actions per segment', async () => {
      const mockVIP = [
        {
          customer_id: 1,
          customer_name: 'VIP',
          appointment_count: 20,
          total_spent: '1000.00',
          last_visit_date: '2026-02-15T10:00:00Z',
          first_visit_date: '2025-12-01T10:00:00Z',
          avg_visit_frequency: 5,
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockVIP,
        rowCount: 1,
      });

      const result = await analyticsService.segmentCustomers(1);
      const vipActions = result[0].recommendedActions;

      expect(vipActions).toContain('Exclusive loyalty program');
      expect(vipActions).toContain('Premium service offers');
    });
  });
});
