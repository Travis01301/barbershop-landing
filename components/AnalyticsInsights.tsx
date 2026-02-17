'use client';

import React, { useEffect, useState } from 'react';

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

export interface AnalyticsInsightsSummary {
  shopAverageNoShowRate: number;
  bestPerformingBarber: BarberStats | null;
  needsAttentionBarber: BarberStats | null;
  totalBarbers: number;
  totalAppointmentsTracked: number;
}

export interface AnalyticsInsightsProps {
  shopId: string;
  showTrends?: boolean;
  compact?: boolean;
}

/**
 * AnalyticsInsights Component
 *
 * Displays trends, predictions, and insights about the barbershop's no-show patterns.
 * Shows best and worst performing barbers, shop-wide statistics, and actionable insights.
 *
 * Example:
 * <AnalyticsInsights shopId={shopId} showTrends compact={false} />
 */
export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({
  shopId,
  showTrends = true,
  compact = false,
}) => {
  const [stats, setStats] = useState<BarberStats[]>([]);
  const [summary, setSummary] = useState<AnalyticsInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/ai/barber-stats?shopId=${shopId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch barber statistics');
        }

        const data = await response.json();
        setStats(data.stats || []);
        setSummary(data.summary);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [shopId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center text-gray-500 py-6">
        No data available yet.
      </div>
    );
  }

  const getRiskColor = (rate: number) => {
    if (rate < 5) return 'text-green-600';
    if (rate < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'space-y-6'}`}>
      {/* Main Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
          <p className="text-sm font-medium text-gray-700">Shop Average No-Show Rate</p>
          <p className={`mt-2 text-3xl font-bold ${getRiskColor(summary.shopAverageNoShowRate)}`}>
            {summary.shopAverageNoShowRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Across {summary.totalAppointmentsTracked} appointments
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
          <p className="text-sm font-medium text-gray-700">Total Barbers</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {summary.totalBarbers}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Tracked and analyzed
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
          <p className="text-sm font-medium text-gray-700">Revenue Impact</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            3-5%
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Potential recovery with AI
          </p>
        </div>
      </div>

      {/* Best & Worst Performers */}
      {showTrends && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summary.bestPerformingBarber && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900">⭐ Best Performer</p>
              <p className="mt-2 text-lg font-bold text-green-700">
                {summary.bestPerformingBarber.barberName}
              </p>
              <div className="mt-3 space-y-1 text-sm text-green-700">
                <p>No-show rate: {summary.bestPerformingBarber.noShowRate.toFixed(1)}%</p>
                <p>Completion rate: {summary.bestPerformingBarber.completionRate.toFixed(1)}%</p>
                <p>Total appointments: {summary.bestPerformingBarber.totalAppointments}</p>
              </div>
            </div>
          )}

          {summary.needsAttentionBarber && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">⚠️ Needs Attention</p>
              <p className="mt-2 text-lg font-bold text-red-700">
                {summary.needsAttentionBarber.barberName}
              </p>
              <div className="mt-3 space-y-1 text-sm text-red-700">
                <p>No-show rate: {summary.needsAttentionBarber.noShowRate.toFixed(1)}%</p>
                <p>Completion rate: {summary.needsAttentionBarber.completionRate.toFixed(1)}%</p>
                <p>Total appointments: {summary.needsAttentionBarber.totalAppointments}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Barbers Table */}
      {!compact && stats.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-4 font-semibold text-gray-900">All Barbers Performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Barber</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">
                    No-Show %
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">
                    Completion %
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">
                    Total Appts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.map((barber) => (
                  <tr key={barber.barberId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {barber.barberName}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${getRiskColor(barber.noShowRate)}`}>
                      {barber.noShowRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-700">
                      {barber.completionRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {barber.totalAppointments}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="font-semibold text-blue-900">💡 Insights & Recommendations</p>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>
            • Use AI predictions to alert high-risk customers 24 hours before appointments
          </li>
          <li>
            • Auto-assign new customers to barbers with lowest no-show rates
          </li>
          <li>
            • Schedule high-risk customers with your best-performing barbers
          </li>
          <li>
            • Monitor peak no-show times and implement targeted reminders
          </li>
          <li>
            • Expected revenue recovery: {summary.shopAverageNoShowRate.toFixed(1)}% × average transaction value
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsInsights;
