'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Analytics {
  id: number;
  campaign_id: number;
  metric_date: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  failure_rate: number;
  conversion_count: number;
  conversion_rate: number;
}

interface SMSAnalyticsProps {
  shopId: number;
  campaignId?: number;
}

export const SMSAnalytics: React.FC<SMSAnalyticsProps> = ({ shopId, campaignId }) => {
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/sms/analytics?campaign_id=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.analytics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!campaignId) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select a campaign to view analytics
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  const latestMetric = analytics[0];
  const chartData = analytics.slice().reverse();

  const aggregatedStats = analytics.reduce(
    (acc, metric) => ({
      total_sent: acc.total_sent + metric.total_sent,
      total_delivered: acc.total_delivered + metric.total_delivered,
      total_failed: acc.total_failed + metric.total_failed,
      conversion_count: acc.conversion_count + metric.conversion_count,
    }),
    { total_sent: 0, total_delivered: 0, total_failed: 0, conversion_count: 0 }
  );

  const overallDeliveryRate =
    aggregatedStats.total_sent > 0
      ? ((aggregatedStats.total_delivered / aggregatedStats.total_sent) * 100).toFixed(1)
      : 0;

  const overallConversionRate =
    aggregatedStats.total_delivered > 0
      ? ((aggregatedStats.conversion_count / aggregatedStats.total_delivered) * 100).toFixed(1)
      : 0;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">SMS Campaign Analytics</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <p className="text-sm text-gray-600">Total Sent</p>
          <p className="text-3xl font-bold text-blue-600">{aggregatedStats.total_sent}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-3xl font-bold text-green-600">{aggregatedStats.total_delivered}</p>
          <p className="text-xs text-gray-500 mt-1">{overallDeliveryRate}% delivery rate</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded">
          <p className="text-sm text-gray-600">Failed</p>
          <p className="text-3xl font-bold text-red-600">{aggregatedStats.total_failed}</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
          <p className="text-sm text-gray-600">Conversions</p>
          <p className="text-3xl font-bold text-purple-600">{aggregatedStats.conversion_count}</p>
          <p className="text-xs text-gray-500 mt-1">{overallConversionRate}% conversion rate</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded border mb-8">
          <h3 className="font-semibold mb-4">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="metric_date"
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_sent" fill="#3b82f6" name="Sent" />
              <Bar dataKey="total_delivered" fill="#10b981" name="Delivered" />
              <Bar dataKey="total_failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Metrics Table */}
      {analytics.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-right">Sent</th>
                <th className="border p-2 text-right">Delivered</th>
                <th className="border p-2 text-right">Failed</th>
                <th className="border p-2 text-right">Delivery Rate</th>
                <th className="border p-2 text-right">Conversions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((metric) => (
                <tr key={metric.id} className="hover:bg-gray-50">
                  <td className="border p-2">
                    {new Date(metric.metric_date).toLocaleDateString()}
                  </td>
                  <td className="border p-2 text-right font-medium">{metric.total_sent}</td>
                  <td className="border p-2 text-right text-green-600 font-medium">
                    {metric.total_delivered}
                  </td>
                  <td className="border p-2 text-right text-red-600 font-medium">
                    {metric.total_failed}
                  </td>
                  <td className="border p-2 text-right">{metric.delivery_rate.toFixed(1)}%</td>
                  <td className="border p-2 text-right">
                    {metric.conversion_count} ({metric.conversion_rate.toFixed(1)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {analytics.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No analytics data available yet
        </div>
      )}
    </div>
  );
};
