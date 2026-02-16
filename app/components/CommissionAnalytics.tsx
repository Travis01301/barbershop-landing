'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CommissionAnalyticsData } from '@/lib/types/commission';

interface CommissionAnalyticsProps {
  shopId: string;
}

export function CommissionAnalytics({ shopId }: CommissionAnalyticsProps) {
  const [data, setData] = useState<CommissionAnalyticsData | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [month]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commissions/analytics?shopId=${shopId}&month=${month}`);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commission Analytics</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue & Commission Trend</h3>
        {data.revenue_trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" />
              <Line type="monotone" dataKey="commission" stroke="#10b981" name="Commission" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-600">No data available</div>
        )}
      </div>

      {/* Top Earners */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Top Earning Barbers</h3>
        {data.top_earners.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_earners}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="barber_name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-600">No data available</div>
        )}
      </div>

      {/* Service Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue by Service Type</h3>
        {data.service_breakdown.length > 0 ? (
          <div className="space-y-3">
            {data.service_breakdown.map((service) => (
              <div key={service.service_type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{service.service_type}</p>
                  <p className="text-sm text-gray-600">{service.count} transactions</p>
                </div>
                <p className="font-bold text-lg">${service.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-600">No data available</div>
        )}
      </div>

      {/* Commission Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Commission Distribution</h3>
        {data.commission_distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.commission_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" name="Number of Transactions" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-600">No data available</div>
        )}
      </div>
    </div>
  );
}
