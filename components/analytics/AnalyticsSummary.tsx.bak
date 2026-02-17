'use client';

import React from 'react';
import { AppointmentMetrics, RevenueSummary } from '@/lib/analytics-service';

interface AnalyticsSummaryProps {
  revenue: RevenueSummary;
  appointments: AppointmentMetrics;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, subtext, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
        </div>
        {icon && <div className="text-3xl ml-4 opacity-20">{icon}</div>}
      </div>
      {trend && (
        <div
          className={`text-xs mt-3 font-semibold ${
            trend === 'up'
              ? 'text-green-600'
              : trend === 'down'
                ? 'text-red-600'
                : 'text-slate-600'
          }`}
        >
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function AnalyticsSummary({ revenue, appointments }: AnalyticsSummaryProps) {
  const formattedRevenue = (revenue.totalRevenue / 100).toFixed(2);
  const averageRevenue = revenue.dailyRevenue.length
    ? (
        revenue.dailyRevenue.reduce((sum, r) => sum + r.revenue, 0) /
        revenue.dailyRevenue.length /
        100
      ).toFixed(2)
    : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Revenue"
        value={`$${formattedRevenue}`}
        icon="💰"
        subtext={`Avg: $${averageRevenue}/day`}
        trend="up"
      />
      <MetricCard
        label="Total Appointments"
        value={appointments.total}
        icon="📅"
        subtext={`${appointments.completed} completed`}
        trend={appointments.completionRate > 80 ? 'up' : 'down'}
      />
      <MetricCard
        label="Cancellation Rate"
        value={`${appointments.cancellationRate}%`}
        icon="❌"
        subtext={`${appointments.cancelled} cancelled`}
        trend={appointments.cancellationRate < 10 ? 'up' : 'down'}
      />
      <MetricCard
        label="No-Show Rate"
        value={`${appointments.noShowRate}%`}
        icon="⏭️"
        subtext={`${appointments.noShow} no-shows`}
        trend={appointments.noShowRate < 5 ? 'up' : 'down'}
      />
    </div>
  );
}
