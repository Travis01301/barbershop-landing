'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

interface CustomerLTV {
  customerId: number;
  customerName: string;
  totalSpent: number;
  appointmentCount: number;
  averageVisitFrequency: number;
  lifetimeValueCategory: 'vip' | 'high-value' | 'regular' | 'at-risk' | 'inactive';
  predictedChurnRisk: number;
}

interface CustomerLTVAnalyticsProps {
  shopId: number;
}

export default function CustomerLTVAnalytics({ shopId }: CustomerLTVAnalyticsProps) {
  const [data, setData] = useState<CustomerLTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/customer-ltv?shopId=${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const segments = data.reduce(
    (acc: any, item) => {
      acc[item.lifetimeValueCategory] = (acc[item.lifetimeValueCategory] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const segmentData = Object.entries(segments).map(([name, value]) => ({ name, value }));

  const totalRevenue = data.reduce((sum, d) => sum + d.totalSpent, 0);
  const avgChurnRisk = data.length > 0 ? data.reduce((sum, d) => sum + d.predictedChurnRisk, 0) / data.length : 0;

  const colors: Record<string, string> = {
    vip: '#ff6b6b',
    'high-value': '#4ecdc4',
    regular: '#45b7d1',
    'at-risk': '#ffd93d',
    inactive: '#95a5a6',
  };

  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-8">Customer Lifetime Value Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Total Customers</h3>
          <p className="text-4xl font-bold mt-2">{data.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Average LTV</h3>
          <p className="text-4xl font-bold mt-2">
            ${data.length > 0 ? (totalRevenue / data.length).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Avg Churn Risk</h3>
          <p className="text-4xl font-bold mt-2">{(avgChurnRisk * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Customer Segments */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Customer Segments</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {segmentData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={colors[entry.name] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue by Segment</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={['vip', 'high-value', 'regular', 'at-risk', 'inactive'].map((category) => ({
                name: category,
                revenue: data
                  .filter((d) => d.lifetimeValueCategory === category)
                  .reduce((sum, d) => sum + d.totalSpent, 0),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Risk vs Spending */}
        <div className="bg-white p-6 rounded-lg shadow col-span-2">
          <h2 className="text-lg font-semibold mb-4">Churn Risk vs Customer Spending</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="totalSpent" name="Total Spent" />
              <YAxis dataKey="predictedChurnRisk" name="Churn Risk" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Customers" data={data} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Top Customers by Spending</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Customer</th>
              <th className="text-right py-2">Total Spent</th>
              <th className="text-right py-2">Appointments</th>
              <th className="text-right py-2">Avg Frequency</th>
              <th className="text-left py-2">Segment</th>
              <th className="text-right py-2">Churn Risk</th>
            </tr>
          </thead>
          <tbody>
            {data
              .sort((a, b) => b.totalSpent - a.totalSpent)
              .slice(0, 20)
              .map((customer) => (
                <tr key={customer.customerId} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{customer.customerName}</td>
                  <td className="py-2 text-right font-semibold">${customer.totalSpent.toFixed(2)}</td>
                  <td className="py-2 text-right">{customer.appointmentCount}</td>
                  <td className="py-2 text-right">{customer.averageVisitFrequency.toFixed(2)}/mo</td>
                  <td className="py-2">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: `${colors[customer.lifetimeValueCategory]}22`, color: colors[customer.lifetimeValueCategory] }}
                    >
                      {customer.lifetimeValueCategory}
                    </span>
                  </td>
                  <td className="py-2 text-right">{(customer.predictedChurnRisk * 100).toFixed(1)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
