'use client';

import { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '@/lib/analytics-service';
import { AnalyticsSummary } from '@/components/analytics/AnalyticsSummary';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { NoShowTrend } from '@/components/analytics/NoShowTrend';
import { BarberPerformanceTable } from '@/components/analytics/BarberPerformance';
import { PeakTimesHeatmapComponent } from '@/components/analytics/PeakTimesHeatmap';

interface DashboardState {
  loading: boolean;
  error: string | null;
  data: AnalyticsDashboard | null;
}

export default function BarberDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [shopId, setShopId] = useState<number | null>(null);
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    data: null,
  });

  // Get shop ID from localStorage or URL
  useEffect(() => {
    const id = localStorage.getItem('shopId');
    if (id) {
      setShopId(parseInt(id, 10));
    } else {
      // Try to get from URL or default
      setShopId(1); // Default shop ID
    }
  }, []);

  // Fetch analytics data
  useEffect(() => {
    if (!shopId) return;

    const fetchAnalytics = async () => {
      setState({ loading: true, error: null, data: null });

      try {
        const response = await fetch(`/api/analytics/dashboard?shopId=${shopId}&dateRange=${dateRange}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analytics');
        }

        setState({
          loading: false,
          error: null,
          data: result.data,
        });
      } catch (err) {
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred',
          data: null,
        });
      }
    };

    fetchAnalytics();
  }, [shopId, dateRange]);

  if (!shopId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg border border-red-200 max-w-md">
          <p className="text-red-600 font-semibold mb-2">Error loading analytics</p>
          <p className="text-sm text-slate-600">{state.error}</p>
        </div>
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-semibold">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">
                Track your barbershop performance and growth
              </p>
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    dateRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400'
                  }`}
                >
                  Last {range.replace('d', '')}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="mb-8">
          <AnalyticsSummary
            revenue={state.data.revenue}
            appointments={state.data.appointments}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <RevenueChart revenue={state.data.revenue} />

          {/* Customer Acquisition Trend */}
          <NoShowTrend customerAcquisition={state.data.customerAcquisition} />
        </div>

        {/* Peak Times Heatmap */}
        <div className="mb-8">
          <PeakTimesHeatmapComponent peakTimes={state.data.peakTimes} />
        </div>

        {/* Barber Performance Table */}
        <div className="mb-8">
          <BarberPerformanceTable barberPerformance={state.data.barberPerformance} />
        </div>
      </div>
    </div>
  );
}
