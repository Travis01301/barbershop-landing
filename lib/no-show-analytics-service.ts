import { query } from './db';
import { aiProvider } from './ai-provider';
import { logger } from './logger';

const analyticsLogger = logger.createChild('no-show-analytics');

export interface NoShowRiskData {
  appointmentId: string;
  customerId: string;
  barberId: string;
  startTime: Date;
  customerHistory?: {
    totalAppointments: number;
    noShowCount: number;
    cancellationCount: number;
    noShowRate: number;
  };
  barberHistory?: {
    noShowRate: number;
    totalAppointments: number;
  };
}

export interface NoShowPrediction {
  appointmentId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  factors: {
    customerHistoryFactor: number;
    timeOfDayFactor: number;
    dayOfWeekFactor: number;
    barberReliabilityFactor: number;
    baselineRiskFactor: number;
  };
  shouldAlert: boolean;
}

export interface BarberStats {
  barberId: string;
  barberName: string;
  totalAppointments: number;
  noShowCount: number;
  noShowRate: number;
  cancellationRate: number;
  completionRate: number;
  peakNoShowHour?: number;
  peakNoShowDay?: number;
}

export interface BookingRecommendation {
  dayOfWeek: number; // 0-6
  dayName: string;
  hour: number; // 0-23
  timeSlot: string; // e.g., "2:00 PM - 2:30 PM"
  noShowRateAtTime: number;
  isBusiest: boolean;
  completionRate: number;
  recommendation: 'optimal' | 'good' | 'busy' | 'avoid';
}

export interface BarberSuggestion {
  barberId: string;
  barberName: string;
  recommendationScore: number; // 0-100 (higher is better)
  noShowRate: number;
  customerHistoryWithBarber: {
    previousAppointments: number;
    noShowCount: number;
    satisfactionScore?: number;
  };
  availabilityPercentage: number;
  reasoning: string;
}

class NoShowAnalyticsService {
  /**
   * Predict no-show risk for an appointment
   */
  async predictNoShowRisk(
    data: NoShowRiskData,
    shopId: string
  ): Promise<NoShowPrediction> {
    try {
      analyticsLogger.debug('Predicting no-show risk', { appointmentId: data.appointmentId });

      // Get customer history
      const customerHistory = data.customerHistory || await this.getCustomerHistory(data.customerId);

      // Get barber history
      const barberHistory = data.barberHistory || await this.getBarberHistory(data.barberId, shopId);

      // Extract time features
      const date = new Date(data.startTime);
      const dayOfWeek = date.getDay();
      const hourOfDay = date.getHours();

      // Get baseline no-show rates from booking patterns
      const bookingPattern = await this.getBookingPattern(shopId, dayOfWeek, hourOfDay);

      // Calculate risk factors
      const factors = this.calculateRiskFactors(
        customerHistory,
        barberHistory,
        dayOfWeek,
        hourOfDay,
        bookingPattern
      );

      // Use LLM to interpret factors and refine prediction
      const riskScore = await this.refinePredictionWithAI(factors, customerHistory, barberHistory);

      // Determine risk level
      const riskLevel = this.getRiskLevel(riskScore);
      const shouldAlert = riskScore > 70;

      const prediction: NoShowPrediction = {
        appointmentId: data.appointmentId,
        riskScore: Math.round(riskScore),
        riskLevel,
        factors,
        shouldAlert,
      };

      analyticsLogger.info('No-show prediction completed', {
        appointmentId: data.appointmentId,
        riskScore: prediction.riskScore,
        riskLevel,
      });

      return prediction;
    } catch (error) {
      analyticsLogger.error('Error predicting no-show risk', error);
      // Return safe default (medium risk)
      return {
        appointmentId: data.appointmentId,
        riskScore: 50,
        riskLevel: 'medium',
        factors: {
          customerHistoryFactor: 0,
          timeOfDayFactor: 0,
          dayOfWeekFactor: 0,
          barberReliabilityFactor: 0,
          baselineRiskFactor: 0,
        },
        shouldAlert: false,
      };
    }
  }

  /**
   * Get optimal booking recommendations for a shop
   */
  async getBookingRecommendations(shopId: string): Promise<BookingRecommendation[]> {
    try {
      analyticsLogger.debug('Getting booking recommendations', { shopId });

      const patterns = await query<any>(
        `SELECT 
          day_of_week, 
          hour_of_day, 
          no_show_rate, 
          completion_rate,
          busiest,
          total_bookings
        FROM booking_patterns
        WHERE shop_id = $1
        ORDER BY completion_rate DESC, no_show_rate ASC
        LIMIT 20`,
        [shopId]
      );

      const recommendations = patterns.rows.map((pattern: any) => {
        const timeSlot = this.formatTimeSlot(pattern.hour_of_day);
        const dayName = this.getDayName(pattern.day_of_week);

        const noShowRate = parseFloat(pattern.no_show_rate || '0');
        const completionRate = parseFloat(pattern.completion_rate || '0');

        let recommendation: 'optimal' | 'good' | 'busy' | 'avoid' = 'good';
        if (noShowRate <= 5 && completionRate >= 95) {
          recommendation = 'optimal';
        } else if (noShowRate > 25 || completionRate < 70) {
          recommendation = 'avoid';
        } else if (pattern.busiest) {
          recommendation = 'busy';
        }

        return {
          dayOfWeek: pattern.day_of_week,
          dayName,
          hour: pattern.hour_of_day,
          timeSlot,
          noShowRateAtTime: noShowRate,
          isBusiest: pattern.busiest || false,
          completionRate,
          recommendation,
        };
      });

      analyticsLogger.info('Booking recommendations retrieved', {
        shopId,
        recommendationCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      analyticsLogger.error('Error getting booking recommendations', error);
      return [];
    }
  }

  /**
   * Suggest the best barber for an appointment based on availability and history
   */
  async suggestBarber(
    shopId: string,
    customerId: string,
    appointmentDate: Date
  ): Promise<BarberSuggestion> {
    try {
      analyticsLogger.debug('Suggesting barber', { shopId, customerId });

      // Get all barbers in the shop with their stats
      const barbers = await query<any>(
        `SELECT b.id, b.name, 
          COALESCE(r.no_show_rate, 0) as no_show_rate,
          COALESCE(r.total_appointments, 0) as total_appointments
        FROM barbers b
        LEFT JOIN barber_no_show_rates r ON b.id = r.barber_id
        WHERE b.shop_id = $1
        ORDER BY COALESCE(r.no_show_rate, 0) ASC`,
        [shopId]
      );

      if (barbers.rows.length === 0) {
        throw new Error('No barbers found for shop');
      }

      // For each barber, calculate a recommendation score
      const suggestions = await Promise.all(
        barbers.rows.map(async (barber: any) => {
          const suggestion = await this.calculateBarberScore(
            barber,
            customerId,
            appointmentDate,
            shopId
          );
          return suggestion;
        })
      );

      // Return the best suggestion
      const bestSuggestion = suggestions.sort((a, b) => b.recommendationScore - a.recommendationScore)[0];

      analyticsLogger.info('Barber suggestion provided', {
        shopId,
        suggestedBarberId: bestSuggestion.barberId,
        score: bestSuggestion.recommendationScore,
      });

      return bestSuggestion;
    } catch (error) {
      analyticsLogger.error('Error suggesting barber', error);
      throw error;
    }
  }

  /**
   * Get aggregated statistics per barber
   */
  async getBarberStats(shopId: string): Promise<BarberStats[]> {
    try {
      analyticsLogger.debug('Getting barber statistics', { shopId });

      const stats = await query<any>(
        `SELECT 
          r.barber_id,
          b.name,
          r.total_appointments,
          r.no_show_count,
          r.no_show_rate,
          r.cancellation_rate,
          r.completion_rate,
          r.peak_no_show_hour,
          r.peak_no_show_day
        FROM barber_no_show_rates r
        JOIN barbers b ON r.barber_id = b.id
        WHERE r.shop_id = $1
        ORDER BY r.no_show_rate ASC`,
        [shopId]
      );

      const result = stats.rows.map((row: any) => ({
        barberId: row.barber_id,
        barberName: row.name,
        totalAppointments: row.total_appointments || 0,
        noShowCount: row.no_show_count || 0,
        noShowRate: parseFloat(row.no_show_rate || '0'),
        cancellationRate: parseFloat(row.cancellation_rate || '0'),
        completionRate: parseFloat(row.completion_rate || '100'),
        peakNoShowHour: row.peak_no_show_hour,
        peakNoShowDay: row.peak_no_show_day,
      }));

      analyticsLogger.info('Barber statistics retrieved', { shopId, count: result.length });

      return result;
    } catch (error) {
      analyticsLogger.error('Error getting barber statistics', error);
      return [];
    }
  }

  /**
   * Save prediction to database for tracking and model improvement
   */
  async savePrediction(
    prediction: NoShowPrediction,
    shopId: string,
    customerId: string,
    barberId: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO no_show_predictions (
          appointment_id, shop_id, customer_id, barber_id,
          no_show_risk_score, risk_level, factors, alert_sent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          prediction.appointmentId,
          shopId,
          customerId,
          barberId,
          prediction.riskScore,
          prediction.riskLevel,
          JSON.stringify(prediction.factors),
          prediction.shouldAlert,
        ]
      );

      analyticsLogger.debug('Prediction saved to database', {
        appointmentId: prediction.appointmentId,
      });
    } catch (error) {
      analyticsLogger.error('Error saving prediction', error);
      throw error;
    }
  }

  /**
   * Record appointment outcome for model training
   */
  async recordAppointmentOutcome(
    appointmentId: string,
    customerId: string,
    barberId: string,
    shopId: string,
    noShow: boolean,
    cancelled: boolean
  ): Promise<void> {
    try {
      const date = new Date();
      const dayOfWeek = date.getDay();
      const hourOfDay = date.getHours();

      // Get customer history
      const customerHistory = await this.getCustomerHistory(customerId);

      // Insert into appointment_analytics
      await query(
        `INSERT INTO appointment_analytics (
          appointment_id, shop_id, customer_id, barber_id,
          appointment_date, day_of_week, hour_of_day,
          no_show, cancelled, completed,
          customer_total_appointments, customer_no_show_count, customer_cancellation_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          appointmentId,
          shopId,
          customerId,
          barberId,
          date,
          dayOfWeek,
          hourOfDay,
          noShow,
          cancelled,
          !noShow && !cancelled,
          customerHistory.totalAppointments,
          customerHistory.noShowCount,
          customerHistory.cancellationCount,
        ]
      );

      // Update barber stats
      await this.updateBarberStats(barberId, shopId);

      // Update booking patterns
      await this.updateBookingPattern(shopId, dayOfWeek, hourOfDay, !noShow, cancelled);

      analyticsLogger.debug('Appointment outcome recorded', {
        appointmentId,
        noShow,
        cancelled,
      });
    } catch (error) {
      analyticsLogger.error('Error recording appointment outcome', error);
      throw error;
    }
  }

  /**
   * Retrain all models for a shop (update predictions with actual outcomes)
   */
  async retrainModels(shopId: string): Promise<{ dataPoints: number; accuracy: number }> {
    try {
      analyticsLogger.debug('Retraining models', { shopId });

      // Get all completed predictions with outcomes
      const completedPredictions = await query<any>(
        `SELECT np.*, aa.no_show, aa.cancelled
        FROM no_show_predictions np
        JOIN appointment_analytics aa ON np.appointment_id = aa.appointment_id
        WHERE np.shop_id = $1 AND aa.completed = true
        LIMIT 1000`,
        [shopId]
      );

      if (completedPredictions.rows.length === 0) {
        return { dataPoints: 0, accuracy: 0 };
      }

      // Calculate accuracy
      let correctPredictions = 0;
      for (const pred of completedPredictions.rows) {
        const actualNoShow = pred.no_show || pred.cancelled;
        const predictedNoShow = pred.no_show_risk_score > 50;
        if (actualNoShow === predictedNoShow) {
          correctPredictions++;
        }

        // Update prediction_correct field
        await query(
          `UPDATE no_show_predictions 
          SET prediction_correct = $1, actual_outcome = $2
          WHERE id = $3`,
          [
            actualNoShow === predictedNoShow,
            actualNoShow ? 'no_show' : 'showed',
            pred.id,
          ]
        );
      }

      const accuracy = (correctPredictions / completedPredictions.rows.length) * 100;

      // Update training session
      await query(
        `INSERT INTO ai_training_sessions (shop_id, model_type, training_data_points, accuracy_score, model_version)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          training_data_points = $3,
          accuracy_score = $4,
          last_trained_at = CURRENT_TIMESTAMP`,
        [shopId, 'no_show_predictor', completedPredictions.rows.length, accuracy, '1.0']
      );

      analyticsLogger.info('Models retrained', {
        shopId,
        dataPoints: completedPredictions.rows.length,
        accuracy: accuracy.toFixed(2),
      });

      return {
        dataPoints: completedPredictions.rows.length,
        accuracy: parseFloat(accuracy.toFixed(2)),
      };
    } catch (error) {
      analyticsLogger.error('Error retraining models', error);
      throw error;
    }
  }

  // ============= Private Helper Methods =============

  private async getCustomerHistory(customerId: string) {
    const result = await query<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN no_show = true THEN 1 ELSE 0 END) as no_show_count,
        SUM(CASE WHEN cancelled = true THEN 1 ELSE 0 END) as cancellation_count
      FROM appointment_analytics
      WHERE customer_id = $1`,
      [customerId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total || '0', 10);
    const noShowCount = parseInt(row.no_show_count || '0', 10);
    const cancellationCount = parseInt(row.cancellation_count || '0', 10);

    return {
      totalAppointments: total,
      noShowCount,
      cancellationCount,
      noShowRate: total > 0 ? (noShowCount / total) * 100 : 0,
    };
  }

  private async getBarberHistory(barberId: string, shopId: string) {
    const result = await query<any>(
      `SELECT 
        total_appointments,
        no_show_count,
        no_show_rate
      FROM barber_no_show_rates
      WHERE barber_id = $1 AND shop_id = $2`,
      [barberId, shopId]
    );

    if (result.rows.length === 0) {
      return { noShowRate: 0, totalAppointments: 0 };
    }

    return {
      noShowRate: parseFloat(result.rows[0].no_show_rate || '0'),
      totalAppointments: result.rows[0].total_appointments || 0,
    };
  }

  private async getBookingPattern(shopId: string, dayOfWeek: number, hourOfDay: number) {
    const result = await query<any>(
      `SELECT 
        no_show_rate, completion_rate, busiest, total_bookings
      FROM booking_patterns
      WHERE shop_id = $1 AND day_of_week = $2 AND hour_of_day = $3`,
      [shopId, dayOfWeek, hourOfDay]
    );

    if (result.rows.length === 0) {
      return {
        noShowRate: 20,
        completionRate: 80,
        busiest: false,
        totalBookings: 0,
      };
    }

    return {
      noShowRate: parseFloat(result.rows[0].no_show_rate || '20'),
      completionRate: parseFloat(result.rows[0].completion_rate || '80'),
      busiest: result.rows[0].busiest || false,
      totalBookings: result.rows[0].total_bookings || 0,
    };
  }

  private calculateRiskFactors(
    customerHistory: any,
    barberHistory: any,
    dayOfWeek: number,
    hourOfDay: number,
    bookingPattern: any
  ) {
    // Customer history factor (0-40): Higher risk if customer has history of no-shows
    const customerHistoryFactor = Math.min(
      40,
      (customerHistory.noShowRate || 0) * 0.4
    );

    // Time of day factor (0-25): Certain hours have higher no-show rates
    // Peak hours (lunch, evening) tend to have higher cancellations
    const timeOfDayFactor = this.getTimeOfDayFactor(hourOfDay);

    // Day of week factor (0-15): Weekends might have different patterns
    const dayOfWeekFactor = this.getDayOfWeekFactor(dayOfWeek);

    // Barber reliability factor (-10 to +10): Good barbers reduce risk
    const barberReliabilityFactor = Math.max(-10, Math.min(10, (barberHistory.noShowRate || 0) * -0.1));

    // Baseline risk factor from booking patterns (0-20)
    const baselineRiskFactor = Math.min(20, (bookingPattern.noShowRate || 0) * 0.2);

    return {
      customerHistoryFactor: parseFloat(customerHistoryFactor.toFixed(2)),
      timeOfDayFactor: parseFloat(timeOfDayFactor.toFixed(2)),
      dayOfWeekFactor: parseFloat(dayOfWeekFactor.toFixed(2)),
      barberReliabilityFactor: parseFloat(barberReliabilityFactor.toFixed(2)),
      baselineRiskFactor: parseFloat(baselineRiskFactor.toFixed(2)),
    };
  }

  private getTimeOfDayFactor(hourOfDay: number): number {
    // High risk during lunch (12-1) and evening rush (5-7)
    if ((hourOfDay >= 12 && hourOfDay <= 13) || (hourOfDay >= 17 && hourOfDay <= 19)) {
      return 20;
    }
    // Moderate risk during business hours
    if (hourOfDay >= 9 && hourOfDay <= 17) {
      return 10;
    }
    // Early morning and late evening
    return 15;
  }

  private getDayOfWeekFactor(dayOfWeek: number): number {
    // Monday: people are busy, slightly higher risk
    if (dayOfWeek === 1) return 8;
    // Friday-Sunday: weekend effect
    if (dayOfWeek >= 5) return 10;
    // Mid-week
    return 5;
  }

  private async refinePredictionWithAI(
    factors: any,
    customerHistory: any,
    barberHistory: any
  ): Promise<number> {
    try {
      const prompt = `You are an expert at predicting no-show risk for barber appointments.

Analyze these factors and provide a risk score (0-100):
- Customer history no-show factor: ${factors.customerHistoryFactor}/40
- Time of day factor: ${factors.timeOfDayFactor}/25
- Day of week factor: ${factors.dayOfWeekFactor}/15
- Barber reliability factor: ${factors.barberReliabilityFactor}/10
- Baseline risk factor: ${factors.baselineRiskFactor}/20

Customer background:
- Total appointments: ${customerHistory.totalAppointments}
- Previous no-shows: ${customerHistory.noShowCount}

Barber statistics:
- No-show rate: ${barberHistory.noShowRate}%
- Total appointments handled: ${barberHistory.totalAppointments}

Respond with only a single number between 0-100 representing the predicted no-show risk.`;

      const response = await aiProvider.sendMessage(
        [{ role: 'user', content: prompt }],
        'bot'
      );

      // Extract the number from the response
      const scoreMatch = response.text.match(/\d+/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[0], 10);
        return Math.min(100, Math.max(0, score));
      }

      // Fallback: sum the factors
      const baseScore =
        factors.customerHistoryFactor +
        factors.timeOfDayFactor +
        factors.dayOfWeekFactor +
        factors.barberReliabilityFactor +
        factors.baselineRiskFactor;

      return Math.min(100, Math.max(0, baseScore));
    } catch (error) {
      analyticsLogger.warn('AI refinement failed, using factor sum', error);
      // Fallback calculation
      const baseScore =
        factors.customerHistoryFactor +
        factors.timeOfDayFactor +
        factors.dayOfWeekFactor +
        factors.barberReliabilityFactor +
        factors.baselineRiskFactor;

      return Math.min(100, Math.max(0, baseScore));
    }
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 35) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  private async calculateBarberScore(
    barber: any,
    customerId: string,
    appointmentDate: Date,
    shopId: string
  ): Promise<BarberSuggestion> {
    // Get customer's history with this barber
    const historyResult = await query<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN no_show = true THEN 1 ELSE 0 END) as no_show_count
      FROM appointment_analytics
      WHERE barber_id = $1 AND customer_id = $2`,
      [barber.id, customerId]
    );

    const history = historyResult.rows[0];
    const previousAppointments = parseInt(history.total || '0', 10);
    const noShowCount = parseInt(history.no_show_count || '0', 10);

    // Calculate recommendation score
    // Lower no-show rate = higher score
    // Previous appointments with customer = bonus
    let score = 100 - barber.no_show_rate;
    if (previousAppointments > 0) {
      score += Math.min(20, previousAppointments * 2); // Bonus for customer familiarity
    }
    score = Math.min(100, score);

    // Check availability
    const availabilityResult = await query<any>(
      `SELECT COUNT(*) as available_slots
      FROM appointments
      WHERE barber_id = $1 AND start_time > $2 AND status IN ('scheduled', 'confirmed')`,
      [barber.id, appointmentDate]
    );

    const availableSlots = parseInt(availabilityResult.rows[0].available_slots || '0', 10);
    const availabilityPercentage = Math.min(100, 100 - availableSlots * 5); // Rough estimate

    return {
      barberId: barber.id,
      barberName: barber.name,
      recommendationScore: score,
      noShowRate: barber.no_show_rate || 0,
      customerHistoryWithBarber: {
        previousAppointments,
        noShowCount,
      },
      availabilityPercentage: Math.max(0, availabilityPercentage),
      reasoning: `${barber.name} has a ${(barber.no_show_rate || 0).toFixed(1)}% no-show rate${
        previousAppointments > 0 ? ` and ${previousAppointments} previous appointments with this customer` : ''
      }. Score: ${score.toFixed(0)}/100`,
    };
  }

  private async updateBarberStats(barberId: string, shopId: string): Promise<void> {
    const statsResult = await query<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN no_show = true THEN 1 ELSE 0 END) as no_show_count,
        SUM(CASE WHEN cancelled = true THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count
      FROM appointment_analytics
      WHERE barber_id = $1`,
      [barberId]
    );

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total || '0', 10);
    const noShowCount = parseInt(stats.no_show_count || '0', 10);
    const cancelledCount = parseInt(stats.cancelled_count || '0', 10);
    const completedCount = parseInt(stats.completed_count || '0', 10);

    const noShowRate = total > 0 ? (noShowCount / total) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelledCount / total) * 100 : 0;
    const completionRate = total > 0 ? (completedCount / total) * 100 : 100;

    await query(
      `INSERT INTO barber_no_show_rates (
        shop_id, barber_id, total_appointments, no_show_count, 
        cancellation_count, completed_count, no_show_rate, 
        cancellation_rate, completion_rate, last_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (barber_id, shop_id) DO UPDATE SET
        total_appointments = $3,
        no_show_count = $4,
        cancellation_count = $5,
        completed_count = $6,
        no_show_rate = $7,
        cancellation_rate = $8,
        completion_rate = $9,
        last_updated_at = CURRENT_TIMESTAMP`,
      [
        shopId,
        barberId,
        total,
        noShowCount,
        cancelledCount,
        completedCount,
        noShowRate.toFixed(2),
        cancellationRate.toFixed(2),
        completionRate.toFixed(2),
      ]
    );
  }

  private async updateBookingPattern(
    shopId: string,
    dayOfWeek: number,
    hourOfDay: number,
    completed: boolean,
    cancelled: boolean
  ): Promise<void> {
    // Get current pattern
    const currentResult = await query<any>(
      `SELECT * FROM booking_patterns
      WHERE shop_id = $1 AND day_of_week = $2 AND hour_of_day = $3`,
      [shopId, dayOfWeek, hourOfDay]
    );

    if (currentResult.rows.length === 0) {
      // Create new pattern
      await query(
        `INSERT INTO booking_patterns (
          shop_id, day_of_week, hour_of_day,
          total_bookings, completed_bookings, cancelled_bookings,
          no_show_count, no_show_rate, cancellation_rate, completion_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          shopId,
          dayOfWeek,
          hourOfDay,
          1,
          completed ? 1 : 0,
          cancelled ? 1 : 0,
          completed ? 0 : 1,
          completed ? 0 : 100,
          cancelled ? 100 : 0,
          completed ? 100 : 0,
        ]
      );
    } else {
      const current = currentResult.rows[0];
      const newTotal = current.total_bookings + 1;
      const newCompleted = current.completed_bookings + (completed ? 1 : 0);
      const newCancelled = current.cancelled_bookings + (cancelled ? 1 : 0);
      const newNoShow = current.no_show_count + (!completed && !cancelled ? 1 : 0);

      await query(
        `UPDATE booking_patterns SET
          total_bookings = $1,
          completed_bookings = $2,
          cancelled_bookings = $3,
          no_show_count = $4,
          no_show_rate = $5,
          cancellation_rate = $6,
          completion_rate = $7,
          last_updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = $8 AND day_of_week = $9 AND hour_of_day = $10`,
        [
          newTotal,
          newCompleted,
          newCancelled,
          newNoShow,
          (newNoShow / newTotal * 100).toFixed(2),
          (newCancelled / newTotal * 100).toFixed(2),
          (newCompleted / newTotal * 100).toFixed(2),
          shopId,
          dayOfWeek,
          hourOfDay,
        ]
      );
    }
  }

  private formatTimeSlot(hour: number): string {
    const startHour = hour % 12 || 12;
    const startPeriod = hour < 12 ? 'AM' : 'PM';
    const endHour = (hour + 1) % 12 || 12;
    const endPeriod = (hour + 1) < 12 ? 'AM' : 'PM';

    return `${startHour}:00 ${startPeriod} - ${endHour}:00 ${endPeriod}`;
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }
}

export const noShowAnalyticsService = new NoShowAnalyticsService();
export default noShowAnalyticsService;
