'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChurnSignal {
  customerId: number;
  customerName: string;
  daysSinceVisit: number;
  churnProbability: number;
  churnScore: number;
  reasons: string[];
  recommendedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ChurnAnalyticsProps {
  shopId: number;
}

export default function ChurnAnalytics({ shopId }: ChurnAnalyticsProps) {
  const [data, setData] = useState<ChurnSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/churn-signals?shopId=${shopId}`);
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

  const riskCounts = data.reduce(
    (acc: any, item) => {
      acc[item.riskLevel] = (acc[item.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const riskData = [
    { name: 'Critical', value: riskCounts.critical || 0, color: '#ff6b6b' },
    { name: 'High', value: riskCounts.high || 0, color: '#ffd93d' },
    { name: 'Medium', value: riskCounts.medium || 0, color: '#45b7d1' },
    { name: 'Low', value: riskCounts.low || 0, color: '#4ecdc4' },
  ];

  const daysDistribution = data.reduce((acc: any, item) => {
    const bucket = Math.floor(item.daysSinceVisit / 30);
    const key = `${bucket * 30}-${(bucket + 1) * 30}`;
    const existing = acc.find((d: any) => d.name === key);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: key, count: 1 });
    }
    return acc;
  }, []);

  const avgChurnScore = data.length > 0 ? data.reduce((sum, d) => sum + d.churnScore, 0) / data.length : 0;

  const colors: Record<string, string> = {
    critical: '#ff6b6b',
    high: '#ffd93d',
    medium: '#45b7d1',
    low: '#4ecdc4',
  };

  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-8">Churn Analysis</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">At Risk Customers</h3>
          <p className="text-4xl font-bold mt-2">{data.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Critical Risk</h3>
          <p className="text-4xl font-bold mt-2 text-red-600">{riskCounts.critical || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">High Risk</h3>
          <p className="text-4xl font-bold mt-2 text-yellow-600">{riskCounts.high || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Avg Churn Score</h3>
          <p className="text-4xl font-bold mt-2">{avgChurnScore.toFixed(1)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Risk Level Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Customers by Risk Level</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Days Since Visit Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Days Since Last Visit</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={daysDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Churn Score Distribution */}
        <div className="bg-white p-6 rounded-lg shadow col-span-2">
          <h2 className="text-lg font-semibold mb-4">Churn Score Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data
                .sort((a, b) => a.churnScore - b.churnScore)
                .map((item, idx) => ({
                  index: idx,
                  churnScore: item.churnScore,
                  riskLevel: item.riskLevel,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="churnScore" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-Risk Customers Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Customers at Risk (Sorted by Risk Score)</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Customer</th>
              <th className="text-right py-2">Days Since Visit</th>
              <th className="text-right py-2">Churn Score</th>
              <th className="text-left py-2">Risk Level</th>
              <th className="text-left py-2">Recommended Actions</th>
            </tr>
          </thead>
          <tbody>
            {data
              .sort((a, b) => b.churnScore - a.churnScore)
              .slice(0, 20)
              .map((customer) => (
                <tr key={customer.customerId} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{customer.customerName}</td>
                  <td className="py-2 text-right">{customer.daysSinceVisit} days</td>
                  <td className="py-2 text-right font-semibold">{customer.churnScore}</td>
                  <td className="py-2">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: colors[customer.riskLevel] }}
                    >
                      {customer.riskLevel}
                    </span>
                  </td>
                  <td className="py-2 text-sm">
                    <div className="flex flex-col gap-1">
                      {customer.recommendedActions.slice(0, 2).map((action, idx) => (
                        <div key={idx} className="text-gray-600">
                          • {action}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
