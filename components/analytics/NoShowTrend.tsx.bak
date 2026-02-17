'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CustomerAcquisitionTrends } from '@/lib/analytics-service';

interface NoShowTrendProps {
  customerAcquisition: CustomerAcquisitionTrends[];
}

export function NoShowTrend({ customerAcquisition }: NoShowTrendProps) {
  // Calculate no-show percentage for each day
  const noShowData = customerAcquisition.map((day) => ({
    date: day.date,
    noShowPercentage:
      day.totalAppointments > 0
        ? Math.round(((day.newCustomers / day.totalAppointments) * 100 * 100) / 100) // Placeholder calculation
        : 0,
    newCustomers: day.newCustomers,
    returningCustomers: day.returningCustomers,
    totalAppointments: day.totalAppointments,
  }));

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Customer Acquisition Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={noShowData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
          />
          <Legend />
          <Bar dataKey="newCustomers" fill="#3b82f6" name="New Customers" radius={[8, 8, 0, 0]} />
          <Bar
            dataKey="returningCustomers"
            fill="#10b981"
            name="Returning Customers"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 font-semibold">Avg New Customers/Day</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {noShowData.length > 0
              ? (
                  noShowData.reduce((sum, d) => sum + d.newCustomers, 0) / noShowData.length
                ).toFixed(1)
              : '0'}
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 font-semibold">Avg Returning/Day</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {noShowData.length > 0
              ? (
                  noShowData.reduce((sum, d) => sum + d.returningCustomers, 0) / noShowData.length
                ).toFixed(1)
              : '0'}
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 font-semibold">Total Appointments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {noShowData.reduce((sum, d) => sum + d.totalAppointments, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
