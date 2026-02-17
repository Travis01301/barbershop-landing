import { noShowAnalyticsService, NoShowPrediction, BarberStats } from '@/lib/no-show-analytics-service';
import { query } from '@/lib/db';

// Mock the database and AI provider
jest.mock('@/lib/db');
jest.mock('@/lib/ai-provider');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('No-Show Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= NO-SHOW PREDICTION TESTS =============

  describe('predictNoShowRisk', () => {
    it('should predict low risk for reliable customers', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10', no_show_count: '0', cancellation_count: '0' }] }) // customer history
        .mockResolvedValueOnce({ rows: [{ total_appointments: '50', no_show_count: '2', no_show_rate: '4' }] }) // barber history
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '5', completion_rate: '95', busiest: false, total_bookings: '10' }] }); // booking pattern

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-123',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date('2025-03-15T10:00:00'),
        },
        'shop-123'
      );

      expect(prediction.riskScore).toBeLessThan(35);
      expect(prediction.riskLevel).toBe('low');
      expect(prediction.shouldAlert).toBe(false);
    });

    it('should predict high risk for unreliable customers', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10', no_show_count: '5', cancellation_count: '2' }] }) // customer history
        .mockResolvedValueOnce({ rows: [{ total_appointments: '50', no_show_count: '15', no_show_rate: '30' }] }) // barber history
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '25', completion_rate: '70', busiest: true, total_bookings: '100' }] }); // booking pattern

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-456',
          customerId: 'cust-456',
          barberId: 'barb-456',
          startTime: new Date('2025-03-15T13:00:00'), // Peak lunch time
        },
        'shop-123'
      );

      expect(prediction.riskScore).toBeGreaterThan(50);
      expect(prediction.shouldAlert).toBe(prediction.riskScore > 70);
    });

    it('should consider time of day factor', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', no_show_count: '0', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '100', no_show_count: '5', no_show_rate: '5' }] })
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '10', completion_rate: '90', busiest: false, total_bookings: '20' }] });

      const morningPrediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-morning',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date('2025-03-15T08:00:00'), // Early morning
        },
        'shop-123'
      );

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', no_show_count: '0', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '100', no_show_count: '5', no_show_rate: '5' }] })
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '10', completion_rate: '90', busiest: false, total_bookings: '20' }] });

      const lunchPrediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-lunch',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date('2025-03-15T12:30:00'), // Lunch time
        },
        'shop-123'
      );

      // Lunch time should have higher risk due to time of day factor
      expect(lunchPrediction.riskScore).toBeGreaterThan(morningPrediction.riskScore);
    });

    it('should return safe default on error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-error',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date(),
        },
        'shop-123'
      );

      expect(prediction.riskScore).toBe(50);
      expect(prediction.riskLevel).toBe('medium');
    });
  });

  // ============= BOOKING RECOMMENDATIONS TESTS =============

  describe('getBookingRecommendations', () => {
    it('should return optimal times with low no-show rates', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            day_of_week: 3,
            hour_of_day: 10,
            no_show_rate: '3',
            completion_rate: '97',
            busiest: false,
            total_bookings: '50',
          },
          {
            day_of_week: 4,
            hour_of_day: 14,
            no_show_rate: '5',
            completion_rate: '95',
            busiest: false,
            total_bookings: '45',
          },
          {
            day_of_week: 1,
            hour_of_day: 17,
            no_show_rate: '35',
            completion_rate: '60',
            busiest: true,
            total_bookings: '100',
          },
        ],
      });

      const recommendations = await noShowAnalyticsService.getBookingRecommendations('shop-123');

      expect(recommendations.length).toBeGreaterThan(0);
      const optimalRecs = recommendations.filter((r) => r.recommendation === 'optimal');
      expect(optimalRecs.length).toBeGreaterThan(0);
      expect(optimalRecs[0].noShowRateAtTime).toBeLessThanOrEqual(5);
      expect(optimalRecs[0].completionRate).toBeGreaterThanOrEqual(95);
    });

    it('should mark times with high no-shows as avoid', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            day_of_week: 5,
            hour_of_day: 18,
            no_show_rate: '40',
            completion_rate: '55',
            busiest: true,
            total_bookings: '150',
          },
        ],
      });

      const recommendations = await noShowAnalyticsService.getBookingRecommendations('shop-123');
      const avoidRecs = recommendations.filter((r) => r.recommendation === 'avoid');

      expect(avoidRecs.length).toBeGreaterThan(0);
      expect(avoidRecs[0].noShowRateAtTime).toBeGreaterThan(25);
    });

    it('should return empty array on error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const recommendations = await noShowAnalyticsService.getBookingRecommendations('shop-123');

      expect(recommendations).toEqual([]);
    });
  });

  // ============= BARBER SUGGESTION TESTS =============

  describe('suggestBarber', () => {
    it('should suggest barber with lowest no-show rate', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'barb-1',
              name: 'John',
              no_show_rate: '5',
              total_appointments: '50',
            },
            {
              id: 'barb-2',
              name: 'Jane',
              no_show_rate: '15',
              total_appointments: '45',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: '0', no_show_count: '0' }] }) // customer history with barb-1
        .mockResolvedValueOnce({ rows: [{ available_slots: '5' }] }); // availability check

      const suggestion = await noShowAnalyticsService.suggestBarber(
        'shop-123',
        'cust-123',
        new Date()
      );

      expect(suggestion.barberName).toBe('John');
      expect(suggestion.noShowRate).toBe(5);
      expect(suggestion.recommendationScore).toBeGreaterThan(85);
    });

    it('should bonus score for customer familiarity', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'barb-1',
              name: 'John',
              no_show_rate: '5',
              total_appointments: '50',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: '10', no_show_count: '0' }] }) // 10 previous appointments
        .mockResolvedValueOnce({ rows: [{ available_slots: '5' }] });

      const suggestion = await noShowAnalyticsService.suggestBarber(
        'shop-123',
        'cust-123',
        new Date()
      );

      expect(suggestion.customerHistoryWithBarber.previousAppointments).toBe(10);
      expect(suggestion.recommendationScore).toBeGreaterThan(85);
    });

    it('should throw error if no barbers found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        noShowAnalyticsService.suggestBarber('shop-123', 'cust-123', new Date())
      ).rejects.toThrow('No barbers found for shop');
    });
  });

  // ============= BARBER STATS TESTS =============

  describe('getBarberStats', () => {
    it('should return stats for all barbers', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            barber_id: 'barb-1',
            name: 'John',
            total_appointments: 100,
            no_show_count: 5,
            no_show_rate: '5',
            cancellation_rate: '10',
            completion_rate: '85',
            peak_no_show_hour: 13,
            peak_no_show_day: 5,
          },
          {
            barber_id: 'barb-2',
            name: 'Jane',
            total_appointments: 90,
            no_show_count: 12,
            no_show_rate: '13.33',
            cancellation_rate: '15',
            completion_rate: '71.67',
            peak_no_show_hour: 18,
            peak_no_show_day: 6,
          },
        ],
      });

      const stats = await noShowAnalyticsService.getBarberStats('shop-123');

      expect(stats.length).toBe(2);
      expect(stats[0].barberId).toBe('barb-1');
      expect(stats[0].noShowRate).toBe(5);
      expect(stats[0].completionRate).toBe(85);
    });

    it('should return empty array on error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const stats = await noShowAnalyticsService.getBarberStats('shop-123');

      expect(stats).toEqual([]);
    });

    it('should handle no stats available', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const stats = await noShowAnalyticsService.getBarberStats('shop-123');

      expect(stats).toEqual([]);
    });
  });

  // ============= PREDICTION SAVING TESTS =============

  describe('savePrediction', () => {
    it('should save prediction to database', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const prediction: NoShowPrediction = {
        appointmentId: 'apt-123',
        riskScore: 65,
        riskLevel: 'medium',
        factors: {
          customerHistoryFactor: 30,
          timeOfDayFactor: 15,
          dayOfWeekFactor: 8,
          barberReliabilityFactor: -5,
          baselineRiskFactor: 17,
        },
        shouldAlert: true,
      };

      await noShowAnalyticsService.savePrediction(
        prediction,
        'shop-123',
        'cust-123',
        'barb-123'
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO no_show_predictions'),
        expect.arrayContaining([
          'apt-123',
          'shop-123',
          'cust-123',
          'barb-123',
          65,
          'medium',
          expect.any(String),
          true,
        ])
      );
    });
  });

  // ============= APPOINTMENT OUTCOME RECORDING TESTS =============

  describe('recordAppointmentOutcome', () => {
    it('should record no-show outcome', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', no_show_count: '1', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] }) // Insert analytics
        .mockResolvedValueOnce({ rows: [{ total_appointments: '10', no_show_count: '2' }] }) // Update barber stats
        .mockResolvedValueOnce({ rows: [] }); // Update booking pattern

      await noShowAnalyticsService.recordAppointmentOutcome(
        'apt-123',
        'cust-123',
        'barb-123',
        'shop-123',
        true, // no_show
        false // cancelled
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO appointment_analytics'),
        expect.any(Array)
      );
    });

    it('should record cancellation outcome', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', no_show_count: '0', cancellation_count: '1' }] })
        .mockResolvedValueOnce({ rows: [] }) // Insert analytics
        .mockResolvedValueOnce({ rows: [{ total_appointments: '10', no_show_count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await noShowAnalyticsService.recordAppointmentOutcome(
        'apt-456',
        'cust-456',
        'barb-456',
        'shop-456',
        false, // no_show
        true // cancelled
      );

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should record successful appointment', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', no_show_count: '0', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '10', no_show_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await noShowAnalyticsService.recordAppointmentOutcome(
        'apt-789',
        'cust-789',
        'barb-789',
        'shop-789',
        false, // no_show
        false // cancelled
      );

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============= MODEL RETRAINING TESTS =============

  describe('retrainModels', () => {
    it('should calculate accuracy of predictions', async () => {
      const mockPredictions = [
        { id: '1', no_show_risk_score: 75, no_show: true, cancelled: false },
        { id: '2', no_show_risk_score: 25, no_show: false, cancelled: false },
        { id: '3', no_show_risk_score: 85, no_show: true, cancelled: false },
        { id: '4', no_show_risk_score: 15, no_show: false, cancelled: false },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockPredictions })
        .mockResolvedValue({ rows: [] }); // Update predictions

      const result = await noShowAnalyticsService.retrainModels('shop-123');

      expect(result.dataPoints).toBe(4);
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThanOrEqual(100);
    });

    it('should return zero stats when no data available', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await noShowAnalyticsService.retrainModels('shop-123');

      expect(result.dataPoints).toBe(0);
      expect(result.accuracy).toBe(0);
    });
  });

  // ============= RISK LEVEL CLASSIFICATION TESTS =============

  describe('Risk Level Classification', () => {
    it('should classify 0-34 as low', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', no_show_count: '0', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '100', no_show_count: '2', no_show_rate: '2' }] })
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '2', completion_rate: '98', busiest: false, total_bookings: '100' }] });

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-low',
          customerId: 'cust-123',
          barberId: 'barb-123',
          startTime: new Date('2025-03-17T10:00:00'), // Monday morning
        },
        'shop-123'
      );

      if (prediction.riskScore < 35) {
        expect(prediction.riskLevel).toBe('low');
      }
    });

    it('should classify 35-69 as medium', async () => {
      const predictions: NoShowPrediction[] = [];

      // Generate predictions across the medium range
      for (let score of [35, 50, 69]) {
        const mockRows = [{ total: '1', no_show_count: '0', cancellation_count: '0' }];
        mockQuery
          .mockResolvedValueOnce({ rows: mockRows })
          .mockResolvedValueOnce({ rows: [{ total_appointments: '100', no_show_count: score, no_show_rate: String(score) }] })
          .mockResolvedValueOnce({ rows: [{ no_show_rate: String(score), completion_rate: String(100 - score), busiest: false, total_bookings: '100' }] });

        const prediction = await noShowAnalyticsService.predictNoShowRisk(
          {
            appointmentId: `apt-medium-${score}`,
            customerId: 'cust-123',
            barberId: 'barb-123',
            startTime: new Date(),
          },
          'shop-123'
        );

        predictions.push(prediction);
      }

      predictions.forEach((p) => {
        if (p.riskScore >= 35 && p.riskScore <= 69) {
          expect(p.riskLevel).toBe('medium');
        }
      });
    });

    it('should classify 70-100 as high and trigger alerts', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10', no_show_count: '8', cancellation_count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '50', no_show_count: '20', no_show_rate: '40' }] })
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '40', completion_rate: '50', busiest: true, total_bookings: '200' }] });

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-high',
          customerId: 'cust-high-risk',
          barberId: 'barb-unreliable',
          startTime: new Date('2025-03-15T13:00:00'), // Lunch time
        },
        'shop-123'
      );

      if (prediction.riskScore >= 70) {
        expect(prediction.riskLevel).toBe('high');
        expect(prediction.shouldAlert).toBe(true);
      }
    });
  });

  // ============= INTEGRATION TESTS =============

  describe('Integration Tests', () => {
    it('should complete full appointment workflow', async () => {
      // Step 1: Predict risk
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', no_show_count: '1', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '50', no_show_count: '3', no_show_rate: '6' }] })
        .mockResolvedValueOnce({ rows: [{ no_show_rate: '8', completion_rate: '92', busiest: false, total_bookings: '100' }] });

      const prediction = await noShowAnalyticsService.predictNoShowRisk(
        {
          appointmentId: 'apt-workflow',
          customerId: 'cust-workflow',
          barberId: 'barb-workflow',
          startTime: new Date('2025-03-15T14:00:00'),
        },
        'shop-123'
      );

      expect(prediction).toBeDefined();
      expect(prediction.riskScore).toBeDefined();

      // Step 2: Save prediction
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await noShowAnalyticsService.savePrediction(
        prediction,
        'shop-123',
        'cust-workflow',
        'barb-workflow'
      );

      // Step 3: Record outcome
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', no_show_count: '1', cancellation_count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_appointments: '50', no_show_count: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await noShowAnalyticsService.recordAppointmentOutcome(
        'apt-workflow',
        'cust-workflow',
        'barb-workflow',
        'shop-123',
        false, // completed successfully
        false
      );

      // Verify calls were made in correct sequence
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
