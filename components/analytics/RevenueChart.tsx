'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { RevenueSummary } from '@/lib/analytics-service';

interface RevenueChartProps {
  revenue: RevenueSummary;
}

export function RevenueChart({ revenue }: RevenueChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Daily Revenue Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={revenue.dailyRevenue}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
            label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: any) => `$${(value / 100).toFixed(2)}`}
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Daily Revenue"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Revenue breakdown by service */}
      {revenue.byService.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-4">Revenue by Service</h3>
          <div className="space-y-3">
            {revenue.byService.map((service, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{service.service}</p>
                  <p className="text-sm text-slate-500">{service.count} appointments</p>
                </div>
                <p className="font-semibold text-slate-900">
                  ${(service.revenue / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue breakdown by barber */}
      {revenue.byBarber.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-4">Revenue by Barber</h3>
          <div className="space-y-3">
            {revenue.byBarber.map((barber, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{barber.barberName}</p>
                <p className="font-semibold text-slate-900">
                  ${(barber.revenue / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
