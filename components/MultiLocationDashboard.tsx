'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface Location {
  id: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  parentShopId?: number;
  locationType: 'parent' | 'franchise' | 'standalone';
}

interface ConsolidatedRevenue {
  parent_shop_id: number;
  child_shop_id: number;
  revenue_date: string;
  total_revenue: number;
  appointment_count: number;
  average_transaction: number;
}

interface MultiLocationDashboardProps {
  parentShopId: number;
}

export default function MultiLocationDashboard({ parentShopId }: MultiLocationDashboardProps) {
  const [hierarchy, setHierarchy] = useState<{ parent?: Location; children: Location[] } | null>(null);
  const [revenue, setRevenue] = useState<ConsolidatedRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [parentShopId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reporting/multi-location?parentShopId=${parentShopId}`
      );
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setHierarchy(data.hierarchy);
      setRevenue(data.revenue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!hierarchy) return <div className="p-8">No data available</div>;

  const chartData = revenue.reduce((acc: any[], item) => {
    const existingDate = acc.find((d) => d.date === item.revenue_date);
    if (existingDate) {
      existingDate.revenue += item.total_revenue;
      existingDate.appointments += item.appointment_count;
    } else {
      acc.push({
        date: item.revenue_date,
        revenue: item.total_revenue,
        appointments: item.appointment_count,
      });
    }
    return acc;
  }, []);

  const locationRevenue = hierarchy.children.map((child) => {
    const childRevenue = revenue
      .filter((r) => r.child_shop_id === child.id)
      .reduce((sum, r) => sum + r.total_revenue, 0);
    return {
      name: child.name,
      value: childRevenue,
    };
  });

  const totalRevenue = revenue.reduce((sum, r) => sum + r.total_revenue, 0);

  return (
    <div className="p-8 bg-gray-50 dark:bg-slate-900 rounded-lg">
      <h1 className="text-3xl font-bold mb-8">Multi-Location Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Locations</h3>
          <p className="text-4xl font-bold mt-2">{hierarchy.children.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Appointments</h3>
          <p className="text-4xl font-bold mt-2">
            {revenue.reduce((sum, r) => sum + r.appointment_count, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Avg Transaction</h3>
          <p className="text-4xl font-bold mt-2">
            $
            {revenue.length > 0
              ? (totalRevenue / revenue.reduce((sum, r) => sum + r.appointment_count, 0)).toFixed(2)
              : '0.00'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Location */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue by Location</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={locationRevenue}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {locationRevenue.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][index % 4]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Locations</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Location</th>
              <th className="text-left py-2">Address</th>
              <th className="text-left py-2">Phone</th>
              <th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Appointments</th>
            </tr>
          </thead>
          <tbody>
            {hierarchy.children.map((child) => {
              const childRevenue = revenue.filter((r) => r.child_shop_id === child.id);
              const totalRev = childRevenue.reduce((sum, r) => sum + r.total_revenue, 0);
              const totalAppts = childRevenue.reduce((sum, r) => sum + r.appointment_count, 0);

              return (
                <tr key={child.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{child.name}</td>
                  <td className="py-2 text-gray-600">{child.address || 'N/A'}</td>
                  <td className="py-2 text-gray-600">{child.phone || 'N/A'}</td>
                  <td className="py-2 text-right font-semibold">${totalRev.toFixed(2)}</td>
                  <td className="py-2 text-right">{totalAppts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
