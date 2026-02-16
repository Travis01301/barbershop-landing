'use client';

import React from 'react';
import { PeakTimesHeatmap } from '@/lib/analytics-service';

interface PeakTimesHeatmapProps {
  peakTimes: PeakTimesHeatmap[];
}

// Helper function to get color based on appointment count
function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return 'bg-slate-100';
  const intensity = (count / maxCount) * 100;
  if (intensity >= 80) return 'bg-red-500 text-white';
  if (intensity >= 60) return 'bg-orange-400 text-white';
  if (intensity >= 40) return 'bg-yellow-300';
  if (intensity >= 20) return 'bg-blue-300';
  return 'bg-blue-100';
}

export function PeakTimesHeatmapComponent({ peakTimes }: PeakTimesHeatmapProps) {
  // Organize data by day and hour
  const maxCount = Math.max(0, ...peakTimes.map((p) => p.appointments)) || 1;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, Map<number, number>>();

  // Initialize the map
  for (let day = 0; day <= 6; day++) {
    dayMap.set(day, new Map());
  }

  // Populate with data
  peakTimes.forEach((peak) => {
    const dayData = dayMap.get(peak.dayOfWeek);
    if (dayData) {
      dayData.set(peak.hourOfDay, peak.appointments);
    }
  });

  // Get all hours from data
  const allHours = new Set(peakTimes.map((p) => p.hourOfDay));
  const hours = Array.from(allHours).sort((a, b) => a - b);

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Peak Times Heatmap</h2>

      {hours.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No booking data available</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-50"></th>
                  {daysOfWeek.map((day, idx) => (
                    <th
                      key={idx}
                      className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-50 text-center w-20"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td className="border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-50 text-center w-16">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {daysOfWeek.map((_, dayIdx) => {
                      const count = dayMap.get(dayIdx)?.get(hour) || 0;
                      return (
                        <td
                          key={`${dayIdx}-${hour}`}
                          className={`border border-slate-200 px-4 py-2 text-center text-sm font-semibold ${getHeatmapColor(
                            count,
                            maxCount
                          )}`}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-100 border border-slate-200"></div>
          <span className="text-xs text-slate-600">No bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100"></div>
          <span className="text-xs text-slate-600">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-300"></div>
          <span className="text-xs text-slate-600">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-300"></div>
          <span className="text-xs text-slate-600">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400"></div>
          <span className="text-xs text-slate-600">Very High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span className="text-xs text-slate-600">Peak</span>
        </div>
      </div>
    </div>
  );
}
