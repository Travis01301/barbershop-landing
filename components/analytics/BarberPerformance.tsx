'use client';

import React from 'react';
import { BarberPerformance } from '@/lib/analytics-service';

interface BarberPerformanceProps {
  barberPerformance: BarberPerformance[];
}

export function BarberPerformanceTable({ barberPerformance }: BarberPerformanceProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Barber Performance</h2>

      {barberPerformance.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No barber data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-900">Barber</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">
                  Appointments
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">Completed</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">Cancelled</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">No-Show</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">
                  Completion %
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-900">Revenue</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-900">Rating</th>
              </tr>
            </thead>
            <tbody>
              {barberPerformance.map((barber, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {barber.barberName}
                  </td>
                  <td className="text-center px-4 py-3 text-slate-600">
                    {barber.appointmentsTotal}
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold text-xs">
                      {barber.appointmentsCompleted}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold text-xs">
                      {barber.appointmentsCancelled}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold text-xs">
                      {barber.appointmentsNoShow}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-slate-200 rounded-full h-2 max-w-xs">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${barber.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-semibold text-slate-900">
                        {barber.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 font-semibold text-slate-900">
                    ${(barber.revenue / 100).toFixed(2)}
                  </td>
                  <td className="text-center px-4 py-3">
                    {barber.reviewCount > 0 ? (
                      <div className="flex flex-col items-center">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < Math.round(barber.averageRating)
                                  ? 'text-yellow-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 mt-1">
                          {barber.averageRating.toFixed(1)} ({barber.reviewCount})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">No reviews</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
