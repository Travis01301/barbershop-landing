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
  ComposedChart,
} from 'recharts';

interface DemandForecast {
  shopId: number;
  serviceId?: number;
  forecastDate: string;
  dayOfWeek: number;
  hourOfDay: number;
  expectedDemand: number;
  confidenceLevel: number;
  peakHour: boolean;
  recommendedStaffCount: number;
}

interface DemandForecastProps {
  shopId: number;
}

export default function DemandForecastComponent({ shopId }: DemandForecastProps) {
  const [data, setData] = useState<DemandForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/demand-forecast?shopId=${shopId}&daysAhead=7`);
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

  // Group by date
  const byDate = data.reduce((acc: any, item) => {
    if (!acc[item.forecastDate]) {
      acc[item.forecastDate] = [];
    }
    acc[item.forecastDate].push(item);
    return acc;
  }, {} as Record<string, DemandForecast[]>);

  // Daily summary
  const dailyData = Object.entries(byDate).map(([date, forecasts]) => ({
    date,
    totalExpectedDemand: (forecasts as DemandForecast[]).reduce((sum, f) => sum + f.expectedDemand, 0),
    peakHours: (forecasts as DemandForecast[]).filter((f) => f.peakHour).length,
    maxStaff: Math.max(...(forecasts as DemandForecast[]).map((f) => f.recommendedStaffCount)),
    avgConfidence:
      (forecasts as DemandForecast[]).reduce((sum, f) => sum + f.confidenceLevel, 0) / (forecasts as DemandForecast[]).length,
  }));

  // Hourly pattern (average across all days)
  const hourlyPattern = Array.from({ length: 10 }, (_, i) => i + 8).map((hour) => {
    const hourForecasts = data.filter((f) => f.hourOfDay === hour);
    return {
      hour: `${hour}:00`,
      demand: hourForecasts.length > 0 ? hourForecasts.reduce((sum, f) => sum + f.expectedDemand, 0) / hourForecasts.length : 0,
      peakCount: hourForecasts.filter((f) => f.peakHour).length,
    };
  });

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekPattern = Array.from({ length: 7 }, (_, i) => i).map((dow) => {
    const dowForecasts = data.filter((f) => f.dayOfWeek === dow);
    return {
      day: dayOfWeekNames[dow],
      demand: dowForecasts.length > 0 ? dowForecasts.reduce((sum, f) => sum + f.expectedDemand, 0) / dowForecasts.length : 0,
    };
  });

  const totalExpectedDemand = data.reduce((sum, f) => sum + f.expectedDemand, 0);
  const peakHours = data.filter((f) => f.peakHour).length;
  const maxStaffNeeded = Math.max(...data.map((f) => f.recommendedStaffCount));

  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-8">Demand Forecast (Next 7 Days)</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Total Expected Bookings</h3>
          <p className="text-4xl font-bold mt-2">{Math.round(totalExpectedDemand)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Peak Hours</h3>
          <p className="text-4xl font-bold mt-2">{peakHours}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Max Staff Needed</h3>
          <p className="text-4xl font-bold mt-2">{maxStaffNeeded}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-semibold">Busiest Day</h3>
          <p className="text-4xl font-bold mt-2">
            {dailyData.length > 0
              ? dayOfWeekNames[new Date(dailyData.reduce((max, d) => (d.totalExpectedDemand > max.totalExpectedDemand ? d : max)).date).getDay()]
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Daily Demand */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Daily Demand Forecast</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalExpectedDemand" fill="#8884d8" name="Expected Demand" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Pattern */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Hourly Demand Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={hourlyPattern}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="demand" fill="#82ca9d" name="Average Demand" />
              <Line type="monotone" dataKey="peakCount" stroke="#ff7c7c" name="Peak Hour Count" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Pattern */}
        <div className="bg-white p-6 rounded-lg shadow col-span-2">
          <h2 className="text-lg font-semibold mb-4">Day of Week Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dayOfWeekPattern}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="demand" stroke="#8884d8" name="Average Demand" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Schedule Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Daily Schedule & Staffing Recommendations</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-right py-2">Expected Demand</th>
              <th className="text-right py-2">Peak Hours</th>
              <th className="text-right py-2">Recommended Staff</th>
              <th className="text-right py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map((day) => (
              <tr key={day.date} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">{new Date(day.date).toLocaleDateString()} ({dayOfWeekNames[new Date(day.date).getDay()]})</td>
                <td className="py-2 text-right font-semibold">{Math.round(day.totalExpectedDemand)} bookings</td>
                <td className="py-2 text-right">{day.peakHours} hours</td>
                <td className="py-2 text-right bg-blue-50 font-bold">{day.maxStaff} staff</td>
                <td className="py-2 text-right">{(day.avgConfidence * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hourly Detail for First Day */}
      {dailyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mt-8">
          <h2 className="text-lg font-semibold mb-4">Hourly Schedule - {new Date(dailyData[0].date).toLocaleDateString()}</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Time</th>
                <th className="text-right py-2">Expected Bookings</th>
                <th className="text-left py-2">Peak Hour</th>
                <th className="text-right py-2">Staff Needed</th>
              </tr>
            </thead>
            <tbody>
              {byDate[dailyData[0].date]
                .sort((a, b) => a.hourOfDay - b.hourOfDay)
                .map((forecast) => (
                  <tr key={`${forecast.forecastDate}-${forecast.hourOfDay}`} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{forecast.hourOfDay}:00 - {forecast.hourOfDay + 1}:00</td>
                    <td className="py-2 text-right font-semibold">{Math.round(forecast.expectedDemand)}</td>
                    <td className="py-2">
                      <span className={forecast.peakHour ? 'text-red-600 font-bold' : 'text-gray-600'}>
                        {forecast.peakHour ? '⭐ Peak' : 'Regular'}
                      </span>
                    </td>
                    <td className="py-2 text-right bg-blue-50 font-bold">{forecast.recommendedStaffCount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
