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
} from 'recharts';

interface BarberPerformance {
  barberId: number;
  barberName: string;
  metricDate: string;
  totalRevenue: number;
  appointmentCount: number;
  averageTransaction: number;
  repeatCustomerCount: number;
  newCustomerCount: number;
}

interface BarberPerformanceAnalyticsProps {
  shopId: number;
}

export default function BarberPerformanceAnalytics({ shopId }: BarberPerformanceAnalyticsProps) {
  const [data, setData] = useState<BarberPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/barber-performance?shopId=${shopId}`);
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

  // Group data by barber
  const barberData = data.reduce((acc: any, item) => {
    const existing = acc.find((b: any) => b.barberId === item.barberId);
    if (existing) {
      existing.totalRevenue += item.totalRevenue;
      existing.appointmentCount += item.appointmentCount;
      existing.repeatCustomerCount += item.repeatCustomerCount;
      existing.newCustomerCount += item.newCustomerCount;
    } else {
      acc.push({
        barberId: item.barberId,
        barberName: item.barberName,
        totalRevenue: item.totalRevenue,
        appointmentCount: item.appointmentCount,
        repeatCustomerCount: item.repeatCustomerCount,
        newCustomerCount: item.newCustomerCount,
        averageTransaction: item.totalRevenue / item.appointmentCount,
      });
    }
    return acc;
  }, []);

  // Timeline data
  const timelineData = data.reduce((acc: any, item) => {
    const existing = acc.find((d: any) => d.date === item.metricDate);
    if (existing) {
      existing.totalRevenue += item.totalRevenue;
      existing.appointmentCount += item.appointmentCount;
    } else {
      acc.push({
        date: item.metricDate,
        totalRevenue: item.totalRevenue,
        appointmentCount: item.appointmentCount,
      });
    }
    return acc;
  }, []);

  return (
    <div className="p-8 bg-gray-50 dark:bg-slate-900 rounded-lg">
      <h1 className="text-3xl font-bold mb-8">Barber Performance Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Barbers</h3>
          <p className="text-4xl font-bold mt-2">{barberData.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Revenue</h3>
          <p className="text-4xl font-bold mt-2">
            ${barberData.reduce((sum: number, b: any) => sum + b.totalRevenue, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Total Appointments</h3>
          <p className="text-4xl font-bold mt-2">
            {barberData.reduce((sum: number, b: any) => sum + b.appointmentCount, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h3 className="text-gray-600 dark:text-slate-400 text-sm font-semibold">Avg per Barber</h3>
          <p className="text-4xl font-bold mt-2">
            ${(barberData.reduce((sum: number, b: any) => sum + b.totalRevenue, 0) / Math.max(1, barberData.length)).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Revenue by Barber */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Revenue by Barber</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barberData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="barberName" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Bar dataKey="totalRevenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments by Barber */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Appointments by Barber</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barberData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="barberName" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="appointmentCount" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow col-span-2">
          <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="totalRevenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barber Details Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Barber Details</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Barber</th>
              <th className="text-right py-2">Revenue</th>
              <th className="text-right py-2">Appointments</th>
              <th className="text-right py-2">Avg Transaction</th>
              <th className="text-right py-2">Repeat Customers</th>
              <th className="text-right py-2">New Customers</th>
            </tr>
          </thead>
          <tbody>
            {barberData
              .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
              .map((barber: any) => (
                <tr key={barber.barberId} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-medium">{barber.barberName}</td>
                  <td className="py-2 text-right font-semibold">${barber.totalRevenue.toFixed(2)}</td>
                  <td className="py-2 text-right">{barber.appointmentCount}</td>
                  <td className="py-2 text-right">${barber.averageTransaction.toFixed(2)}</td>
                  <td className="py-2 text-right text-green-600">{barber.repeatCustomerCount}</td>
                  <td className="py-2 text-right text-blue-600">{barber.newCustomerCount}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
