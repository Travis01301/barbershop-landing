import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { NoShowRiskBadge } from '@/components/NoShowRiskBadge';
import { BookingRecommendations } from '@/components/BookingRecommendations';
import { BarberSuggestion } from '@/components/BarberSuggestion';
import { AnalyticsInsights } from '@/components/AnalyticsInsights';

// Mock fetch globally
global.fetch = jest.fn();

describe('No-Show Analytics Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= NO-SHOW RISK BADGE TESTS =============

  describe('NoShowRiskBadge Component', () => {
    it('should render low risk badge', () => {
      render(
        <NoShowRiskBadge riskScore={15} riskLevel="low" showScore />
      );

      expect(screen.getByText('Low Risk')).toBeInTheDocument();
      expect(screen.getByText('15% risk')).toBeInTheDocument();
    });

    it('should render medium risk badge', () => {
      render(
        <NoShowRiskBadge riskScore={50} riskLevel="medium" showScore />
      );

      expect(screen.getByText('Medium Risk')).toBeInTheDocument();
      expect(screen.getByText('50% risk')).toBeInTheDocument();
    });

    it('should render high risk badge with alert', () => {
      render(
        <NoShowRiskBadge riskScore={85} riskLevel="high" showScore />
      );

      expect(screen.getByText('High Risk - Alert!')).toBeInTheDocument();
      expect(screen.getByText('85% risk')).toBeInTheDocument();
    });

    it('should respect size prop', () => {
      const { container } = render(
        <NoShowRiskBadge riskScore={50} riskLevel="medium" size="lg" />
      );

      const badge = container.querySelector('div');
      expect(badge).toHaveClass('px-4', 'py-3', 'text-base');
    });

    it('should hide label when showLabel is false', () => {
      render(
        <NoShowRiskBadge riskScore={50} riskLevel="medium" showLabel={false} />
      );

      expect(screen.queryByText('Medium Risk')).not.toBeInTheDocument();
    });

    it('should apply correct colors for each risk level', () => {
      const { container: lowContainer } = render(
        <NoShowRiskBadge riskScore={15} riskLevel="low" />
      );
      expect(lowContainer.querySelector('div')).toHaveClass('bg-green-50');

      const { container: mediumContainer } = render(
        <NoShowRiskBadge riskScore={50} riskLevel="medium" />
      );
      expect(mediumContainer.querySelector('div')).toHaveClass('bg-yellow-50');

      const { container: highContainer } = render(
        <NoShowRiskBadge riskScore={85} riskLevel="high" />
      );
      expect(highContainer.querySelector('div')).toHaveClass('bg-red-50');
    });
  });

  // ============= BOOKING RECOMMENDATIONS TESTS =============

  describe('BookingRecommendations Component', () => {
    const mockRecommendations = {
      success: true,
      recommendations: [
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
          noShowRateAtTime: 35,
          isBusiest: true,
          completionRate: 60,
          recommendation: 'avoid' as const,
        },
      ],
      summary: {
        bestTimeSlots: [],
        timesToAvoid: [],
        busiestTimes: [],
      },
    };

    it('should load and display recommendations', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecommendations,
      });

      render(<BookingRecommendations shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText('Optimal Booking Times')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Wednesday')).toBeInTheDocument();
        expect(screen.getByText('Friday')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<BookingRecommendations shopId="shop-123" />);

      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
    });

    it('should display error state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<BookingRecommendations shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it('should filter recommendations by type', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecommendations,
      });

      render(<BookingRecommendations shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText('Optimal')).toBeInTheDocument();
      });

      const optimalButton = screen.getByText('Optimal');
      fireEvent.click(optimalButton);

      await waitFor(() => {
        expect(screen.getByText('Wednesday')).toBeInTheDocument();
        expect(screen.queryByText('Friday')).not.toBeInTheDocument();
      });
    });

    it('should call onSelectTime callback', async () => {
      const mockCallback = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecommendations,
      });

      render(
        <BookingRecommendations shopId="shop-123" onSelectTime={mockCallback} />
      );

      await waitFor(() => {
        expect(screen.getByText('Wednesday')).toBeInTheDocument();
      });

      const wednesdaySlot = screen.getByText('Wednesday').closest('div');
      fireEvent.click(wednesdaySlot!);

      expect(mockCallback).toHaveBeenCalledWith(3, 10);
    });

    it('should display no-show and completion rates', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecommendations,
      });

      render(<BookingRecommendations shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/No-shows: 3.0%/)).toBeInTheDocument();
        expect(screen.getByText(/Completion: 97.0%/)).toBeInTheDocument();
      });
    });
  });

  // ============= BARBER SUGGESTION TESTS =============

  describe('BarberSuggestion Component', () => {
    const mockSuggestion = {
      success: true,
      suggestion: {
        barberId: 'barb-1',
        barberName: 'John',
        recommendationScore: 92,
        noShowRate: 5,
        customerHistoryWithBarber: {
          previousAppointments: 3,
          noShowCount: 0,
        },
        availabilityPercentage: 85,
        reasoning: 'John has excellent reliability and customer history',
      },
    };

    it('should load and display barber suggestion', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestion,
      });

      render(
        <BarberSuggestion
          shopId="shop-123"
          customerId="cust-123"
          appointmentDate={new Date()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Recommended Barber')).toBeInTheDocument();
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('should display recommendation score', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestion,
      });

      render(
        <BarberSuggestion
          shopId="shop-123"
          customerId="cust-123"
          appointmentDate={new Date()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/92\/100/)).toBeInTheDocument();
      });
    });

    it('should display no-show rate', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestion,
      });

      render(
        <BarberSuggestion
          shopId="shop-123"
          customerId="cust-123"
          appointmentDate={new Date()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5.0%')).toBeInTheDocument();
      });
    });

    it('should show customer history', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestion,
      });

      render(
        <BarberSuggestion
          shopId="shop-123"
          customerId="cust-123"
          appointmentDate={new Date()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/3/)).toBeInTheDocument();
      });
    });

    it('should call onSelect callback', async () => {
      const mockCallback = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestion,
      });

      render(
        <BarberSuggestion
          shopId="shop-123"
          customerId="cust-123"
          appointmentDate={new Date()}
          onSelect={mockCallback}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select')).toBeInTheDocument();
      });

      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          barberId: 'barb-1',
          barberName: 'John',
        })
      );
    });
  });

  // ============= ANALYTICS INSIGHTS TESTS =============

  describe('AnalyticsInsights Component', () => {
    const mockStats = {
      success: true,
      stats: [
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
      ],
      summary: {
        shopAverageNoShowRate: 7.5,
        bestPerformingBarber: {
          barberId: 'barb-1',
          barberName: 'John',
          noShowRate: 5.33,
          totalAppointments: 150,
          noShowCount: 8,
          cancellationRate: 10,
          completionRate: 84.67,
        },
        needsAttentionBarber: {
          barberId: 'barb-2',
          barberName: 'Jane',
          noShowRate: 10,
          totalAppointments: 140,
          noShowCount: 14,
          cancellationRate: 12,
          completionRate: 78,
        },
        totalBarbers: 2,
        totalAppointmentsTracked: 290,
      },
    };

    it('should load and display analytics', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/7.5%/)).toBeInTheDocument();
      });
    });

    it('should display shop average no-show rate', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText('Shop Average No-Show Rate')).toBeInTheDocument();
      });
    });

    it('should highlight best performer', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText('⭐ Best Performer')).toBeInTheDocument();
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('should flag needs attention barber', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText('⚠️ Needs Attention')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });
    });

    it('should display all barbers table when not compact', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" compact={false} />);

      await waitFor(() => {
        expect(screen.getByText('All Barbers Performance')).toBeInTheDocument();
      });
    });

    it('should show insights and recommendations', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/💡 Insights & Recommendations/)).toBeInTheDocument();
        expect(screen.getByText(/Alert high-risk customers/)).toBeInTheDocument();
      });
    });

    it('should display loading state', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(() => {})
      );

      render(<AnalyticsInsights shopId="shop-123" />);

      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });
  });

  // ============= INTEGRATION TESTS =============

  describe('Component Integration', () => {
    it('should work together in a dashboard', async () => {
      const mockPrediction = {
        success: true,
        prediction: {
          appointmentId: 'apt-123',
          riskScore: 60,
          riskLevel: 'medium' as const,
          factors: {},
          shouldAlert: false,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPrediction,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            recommendations: [],
            summary: {},
          }),
        });

      render(
        <>
          <NoShowRiskBadge
            riskScore={60}
            riskLevel="medium"
            showScore
          />
          <BookingRecommendations shopId="shop-123" />
        </>
      );

      await waitFor(() => {
        expect(screen.getByText('Medium Risk')).toBeInTheDocument();
      });
    });
  });

  // ============= ACCESSIBILITY TESTS =============

  describe('Accessibility', () => {
    it('should have proper semantic HTML', () => {
      const { container } = render(
        <NoShowRiskBadge riskScore={50} riskLevel="medium" />
      );

      const badge = container.querySelector('div');
      expect(badge).toBeInTheDocument();
    });

    it('should display text content for screen readers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          stats: [],
          summary: {
            shopAverageNoShowRate: 10,
            bestPerformingBarber: null,
            needsAttentionBarber: null,
            totalBarbers: 0,
            totalAppointmentsTracked: 0,
          },
        }),
      });

      render(<AnalyticsInsights shopId="shop-123" />);

      await waitFor(() => {
        expect(screen.getByText(/Shop Average No-Show Rate/)).toBeInTheDocument();
      });
    });
  });
});
