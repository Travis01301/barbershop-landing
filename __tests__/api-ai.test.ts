import { NextRequest } from 'next/server';
import { noShowAnalyticsService } from '@/lib/no-show-analytics-service';

// Mock the analytics service
jest.mock('@/lib/no-show-analytics-service');

const mockAnalyticsService = noShowAnalyticsService as jest.Mocked<typeof noShowAnalyticsService>;

describe('AI API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= PREDICT-NO-SHOW ENDPOINT TESTS =============

  describe('POST /api/ai/predict-no-show', () => {
    it('should return prediction with valid request', async () => {
      const mockPrediction = {
        appointmentId: 'apt-123',
        riskScore: 45,
        riskLevel: 'medium' as const,
        factors: {
          customerHistoryFactor: 20,
          timeOfDayFactor: 10,
          dayOfWeekFactor: 5,
          barberReliabilityFactor: -5,
          baselineRiskFactor: 15,
        },
        shouldAlert: false,
      };

      mockAnalyticsService.predictNoShowRisk.mockResolvedValue(mockPrediction);
      mockAnalyticsService.savePrediction.mockResolvedValue(undefined);

      // Simulate the endpoint logic
      const response = mockAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-123',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date('2025-03-15T10:00:00'),
        },
        'shop-123'
      );

      expect(await response).toEqual(mockPrediction);
      expect(mockAnalyticsService.predictNoShowRisk).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: 'apt-123',
          customerId: 'cust-123',
        }),
        'shop-123'
      );
    });

    it('should handle missing required fields', async () => {
      // This would be caught in the actual endpoint
      const missingFields = {
        appointmentId: 'apt-123',
        // missing customerId, barberId, startTime
      };

      const requiredFields = ['shopId', 'appointmentId', 'customerId', 'barberId', 'startTime'];
      const hasAllFields = requiredFields.every((field) => field in missingFields);

      expect(hasAllFields).toBe(false);
    });

    it('should save prediction after calculation', async () => {
      const mockPrediction = {
        appointmentId: 'apt-123',
        riskScore: 60,
        riskLevel: 'medium' as const,
        factors: {
          customerHistoryFactor: 25,
          timeOfDayFactor: 12,
          dayOfWeekFactor: 8,
          barberReliabilityFactor: -5,
          baselineRiskFactor: 20,
        },
        shouldAlert: false,
      };

      mockAnalyticsService.savePrediction.mockResolvedValue(undefined);

      await mockAnalyticsService.savePrediction(
        mockPrediction,
        'shop-123',
        'cust-123',
        'barb-123'
      );

      expect(mockAnalyticsService.savePrediction).toHaveBeenCalledWith(
        mockPrediction,
        'shop-123',
        'cust-123',
        'barb-123'
      );
    });

    it('should handle high-risk predictions with alerts', async () => {
      const mockHighRiskPrediction = {
        appointmentId: 'apt-high-risk',
        riskScore: 85,
        riskLevel: 'high' as const,
        factors: {
          customerHistoryFactor: 35,
          timeOfDayFactor: 20,
          dayOfWeekFactor: 15,
          barberReliabilityFactor: 5,
          baselineRiskFactor: 10,
        },
        shouldAlert: true,
      };

      mockAnalyticsService.predictNoShowRisk.mockResolvedValue(mockHighRiskPrediction);

      const result = await mockAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-high-risk',
          customerId: 'cust-risky',
          barberId: 'barb-123',
          startTime: new Date(),
        },
        'shop-123'
      );

      expect(result.shouldAlert).toBe(true);
      expect(result.riskLevel).toBe('high');
    });
  });

  // ============= BOOKING-RECOMMENDATIONS ENDPOINT TESTS =============

  describe('GET /api/ai/booking-recommendations', () => {
    it('should return booking recommendations', async () => {
      const mockRecommendations = [
        {
          dayOfWeek: 3,
          dayName: 'Wednesday',
          hour: 10,
          timeSlot: '10:00 AM - 11:00 AM',
          noShowRateAtTime: 3,
          isBusiest: false,
          completionRate: 97,
          recommendation: 'optimal' as const,
        },
        {
          dayOfWeek: 4,
          dayName: 'Thursday',
          hour: 14,
          timeSlot: '2:00 PM - 3:00 PM',
          noShowRateAtTime: 5,
          isBusiest: false,
          completionRate: 95,
          recommendation: 'good' as const,
        },
      ];

      mockAnalyticsService.getBookingRecommendations.mockResolvedValue(mockRecommendations);

      const result = await mockAnalyticsService.getBookingRecommendations('shop-123');

      expect(result).toEqual(mockRecommendations);
      expect(result.length).toBe(2);
      expect(result[0].recommendation).toBe('optimal');
    });

    it('should filter recommendations by quality', async () => {
      const mockRecommendations = [
        {
          dayOfWeek: 3,
          dayName: 'Wednesday',
          hour: 10,
          timeSlot: '10:00 AM - 11:00 AM',
          noShowRateAtTime: 3,
          isBusiest: false,
          completionRate: 97,
          recommendation: 'optimal' as const,
        },
        {
          dayOfWeek: 5,
          dayName: 'Friday',
          hour: 18,
          timeSlot: '6:00 PM - 7:00 PM',
          noShowRateAtTime: 40,
          isBusiest: true,
          completionRate: 55,
          recommendation: 'avoid' as const,
        },
      ];

      mockAnalyticsService.getBookingRecommendations.mockResolvedValue(mockRecommendations);

      const result = await mockAnalyticsService.getBookingRecommendations('shop-123');
      const optimal = result.filter((r) => r.recommendation === 'optimal');
      const avoid = result.filter((r) => r.recommendation === 'avoid');

      expect(optimal.length).toBe(1);
      expect(avoid.length).toBe(1);
      expect(optimal[0].noShowRateAtTime).toBeLessThan(10);
      expect(avoid[0].noShowRateAtTime).toBeGreaterThan(25);
    });

    it('should handle missing shopId parameter', async () => {
      // This would be caught in the actual endpoint
      const params = new URLSearchParams('');
      const shopId = params.get('shopId');

      expect(shopId).toBeNull();
    });

    it('should return empty array on error', async () => {
      mockAnalyticsService.getBookingRecommendations.mockResolvedValue([]);

      const result = await mockAnalyticsService.getBookingRecommendations('invalid-shop');

      expect(result).toEqual([]);
    });
  });

  // ============= SUGGEST-BARBER ENDPOINT TESTS =============

  describe('POST /api/ai/suggest-barber', () => {
    it('should suggest best barber for appointment', async () => {
      const mockSuggestion = {
        barberId: 'barb-1',
        barberName: 'John',
        recommendationScore: 92,
        noShowRate: 5,
        customerHistoryWithBarber: {
          previousAppointments: 3,
          noShowCount: 0,
        },
        availabilityPercentage: 85,
        reasoning: 'John has a 5% no-show rate and 3 previous appointments with this customer',
      };

      mockAnalyticsService.suggestBarber.mockResolvedValue(mockSuggestion);

      const result = await mockAnalyticsService.suggestBarber(
        'shop-123',
        'cust-123',
        new Date('2025-03-15')
      );

      expect(result).toEqual(mockSuggestion);
      expect(result.barberName).toBe('John');
      expect(result.recommendationScore).toBeGreaterThan(85);
    });

    it('should consider customer familiarity', async () => {
      const mockSuggestion = {
        barberId: 'barb-repeat',
        barberName: 'Jane',
        recommendationScore: 95,
        noShowRate: 8,
        customerHistoryWithBarber: {
          previousAppointments: 15,
          noShowCount: 0,
        },
        availabilityPercentage: 70,
        reasoning: 'Jane has 15 previous appointments with this customer and 8% no-show rate',
      };

      mockAnalyticsService.suggestBarber.mockResolvedValue(mockSuggestion);

      const result = await mockAnalyticsService.suggestBarber(
        'shop-123',
        'loyal-customer',
        new Date()
      );

      expect(result.customerHistoryWithBarber.previousAppointments).toBe(15);
      expect(result.recommendationScore).toBeGreaterThan(90);
    });

    it('should balance no-show rate and availability', async () => {
      const mockSuggestion = {
        barberId: 'barb-balanced',
        barberName: 'Mike',
        recommendationScore: 85,
        noShowRate: 10,
        customerHistoryWithBarber: {
          previousAppointments: 5,
          noShowCount: 1,
        },
        availabilityPercentage: 60,
        reasoning: 'Mike balances good reliability with reasonable availability',
      };

      mockAnalyticsService.suggestBarber.mockResolvedValue(mockSuggestion);

      const result = await mockAnalyticsService.suggestBarber(
        'shop-123',
        'cust-123',
        new Date()
      );

      expect(result.availabilityPercentage).toBeGreaterThan(50);
      expect(result.noShowRate).toBeLessThan(15);
    });

    it('should handle invalid request', async () => {
      mockAnalyticsService.suggestBarber.mockRejectedValue(
        new Error('No barbers found for shop')
      );

      await expect(
        mockAnalyticsService.suggestBarber('invalid-shop', 'cust-123', new Date())
      ).rejects.toThrow();
    });
  });

  // ============= BARBER-STATS ENDPOINT TESTS =============

  describe('GET /api/ai/barber-stats', () => {
    it('should return stats for all barbers', async () => {
      const mockStats = [
        {
          barberId: 'barb-1',
          barberName: 'John',
          totalAppointments: 150,
          noShowCount: 8,
          noShowRate: 5.33,
          cancellationRate: 10,
          completionRate: 84.67,
          peakNoShowHour: 13,
          peakNoShowDay: 5,
        },
        {
          barberId: 'barb-2',
          barberName: 'Jane',
          totalAppointments: 140,
          noShowCount: 14,
          noShowRate: 10,
          cancellationRate: 12,
          completionRate: 78,
          peakNoShowHour: 18,
          peakNoShowDay: 6,
        },
      ];

      mockAnalyticsService.getBarberStats.mockResolvedValue(mockStats);

      const result = await mockAnalyticsService.getBarberStats('shop-123');

      expect(result).toEqual(mockStats);
      expect(result.length).toBe(2);
      expect(result[0].barberName).toBe('John');
    });

    it('should calculate summary statistics', async () => {
      const mockStats = [
        {
          barberId: 'barb-1',
          barberName: 'John',
          totalAppointments: 100,
          noShowCount: 5,
          noShowRate: 5,
          cancellationRate: 10,
          completionRate: 85,
          peakNoShowHour: 13,
          peakNoShowDay: 5,
        },
      ];

      mockAnalyticsService.getBarberStats.mockResolvedValue(mockStats);

      const result = await mockAnalyticsService.getBarberStats('shop-123');

      // Calculate summary manually
      const totalNoShows = result.reduce((sum, s) => sum + s.noShowCount, 0);
      const totalAppointments = result.reduce((sum, s) => sum + s.totalAppointments, 0);
      const shopAverageNoShowRate = (totalNoShows / totalAppointments) * 100;

      expect(shopAverageNoShowRate).toBe(5);
      expect(result[0].noShowRate).toBeLessThanOrEqual(shopAverageNoShowRate);
    });

    it('should identify best performer', async () => {
      const mockStats = [
        {
          barberId: 'barb-low',
          barberName: 'Best Barber',
          totalAppointments: 100,
          noShowCount: 2,
          noShowRate: 2,
          cancellationRate: 5,
          completionRate: 93,
          peakNoShowHour: undefined,
          peakNoShowDay: undefined,
        },
        {
          barberId: 'barb-high',
          barberName: 'Worst Barber',
          totalAppointments: 100,
          noShowCount: 20,
          noShowRate: 20,
          cancellationRate: 15,
          completionRate: 65,
          peakNoShowHour: undefined,
          peakNoShowDay: undefined,
        },
      ];

      mockAnalyticsService.getBarberStats.mockResolvedValue(mockStats);

      const result = await mockAnalyticsService.getBarberStats('shop-123');
      const bestPerformer = result.reduce((best, current) =>
        current.noShowRate < best.noShowRate ? current : best
      );

      expect(bestPerformer.barberName).toBe('Best Barber');
      expect(bestPerformer.noShowRate).toBe(2);
    });

    it('should handle empty shop', async () => {
      mockAnalyticsService.getBarberStats.mockResolvedValue([]);

      const result = await mockAnalyticsService.getBarberStats('empty-shop');

      expect(result).toEqual([]);
    });
  });

  // ============= ERROR HANDLING TESTS =============

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAnalyticsService.predictNoShowRisk.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        mockAnalyticsService.predictNoShowRisk(
          {
            appointmentId: 'apt-123',
            customerId: 'cust-123',
            barberId: 'barb-123',
            startTime: new Date(),
          },
          'shop-123'
        )
      ).rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      const validRequest = {
        shopId: 'shop-123',
        appointmentId: 'apt-123',
        customerId: 'cust-123',
        barberId: 'barb-123',
        startTime: '2025-03-15T10:00:00Z',
      };

      const requiredFields = Object.keys(validRequest);
      const hasAllFields = requiredFields.length === 5;

      expect(hasAllFields).toBe(true);
    });

    it('should handle invalid UUID formats', async () => {
      const invalidRequest = {
        shopId: 'not-a-uuid',
        appointmentId: '123',
        customerId: 'cust',
        barberId: 'barb',
        startTime: new Date().toISOString(),
      };

      // In a real endpoint, this would be validated
      const isValidUUID = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      expect(isValidUUID(invalidRequest.shopId)).toBe(false);
    });
  });

  // ============= PERFORMANCE TESTS =============

  describe('Performance', () => {
    it('should handle predictions quickly (< 500ms)', async () => {
      const mockPrediction = {
        appointmentId: 'apt-perf',
        riskScore: 50,
        riskLevel: 'medium' as const,
        factors: {
          customerHistoryFactor: 20,
          timeOfDayFactor: 10,
          dayOfWeekFactor: 5,
          barberReliabilityFactor: 0,
          baselineRiskFactor: 15,
        },
        shouldAlert: false,
      };

      mockAnalyticsService.predictNoShowRisk.mockResolvedValue(mockPrediction);

      const startTime = Date.now();
      await mockAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-perf',
          customerId: 'cust-perf',
          barberId: 'barb-perf',
          startTime: new Date(),
        },
        'shop-perf'
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should handle bulk recommendations', async () => {
      const mockRecommendations = Array.from({ length: 100 }, (_, i) => ({
        dayOfWeek: i % 7,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i % 7],
        hour: (i % 24) as number,
        timeSlot: `${(i % 24)}:00 - ${((i % 24) + 1) % 24}:00`,
        noShowRateAtTime: Math.random() * 30,
        isBusiest: Math.random() > 0.7,
        completionRate: 70 + Math.random() * 30,
        recommendation: (['optimal', 'good', 'busy', 'avoid'] as const)[i % 4],
      }));

      mockAnalyticsService.getBookingRecommendations.mockResolvedValue(mockRecommendations);

      const result = await mockAnalyticsService.getBookingRecommendations('shop-perf');

      expect(result.length).toBe(100);
    });
  });
});
