'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
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
} from 'recharts'

interface AnalyticsData {
  success: boolean
  summary: {
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    cancellationRate: number
    totalRevenue: number
    totalTips: number
    averagePayment: number
  }
  trend: Array<{ date: string; bookings: number; cancellations: number }>
  revenueBreakdown: { deposits: number; tips: number }
  paymentMethods: Array<{ method: string; count: number; total: number }>
  barberPerformance: Array<{
    id: number
    name: string
    totalBookings: number
    completedBookings: number
    revenue: number
  }>
  peakHours: Array<{ hour: string; bookings: number }>
  peakDays: Array<{ day: string; dayOfWeek: number; bookings: number }>
  topCustomers: Array<{
    name: string
    email: string
    bookings: number
    lastBooking: string
  }>
}

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
}

function MetricCard({ label, value, subtext, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
        </div>
        {icon && <div className="text-3xl ml-4 opacity-20">{icon}</div>}
      </div>
      {trend && (
        <div className={`text-xs mt-3 font-semibold ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysFilter, setDaysFilter] = useState(30)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        // Get shop slug from URL or use default
        const slug = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] || 'demo' : 'demo'
        
        const response = await fetch(`/api/analytics/${slug}?days=${daysFilter}`)
        if (!response.ok) throw new Error('Failed to fetch analytics')
        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError((err as Error).message)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [daysFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg border border-red-200 max-w-md">
          <p className="text-red-600 font-semibold mb-2">Error loading analytics</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-semibold">No analytics data available</p>
        </div>
      </div>
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
              <p className="text-sm text-slate-600 mt-1">Track your barbershop performance and growth</p>
            </div>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysFilter(days)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    daysFilter === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400'
                  }`}
                >
                  Last {days}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Bookings"
            value={data.summary.totalBookings}
            icon="📅"
            subtext={`${data.summary.completedBookings} completed`}
          />
          <MetricCard
            label="Cancellation Rate"
            value={`${data.summary.cancellationRate}%`}
            icon="❌"
            subtext={`${data.summary.cancelledBookings} cancelled`}
            trend={data.summary.cancellationRate > 10 ? 'down' : 'up'}
          />
          <MetricCard
            label="Total Revenue"
            value={`$${(data.summary.totalRevenue / 100).toFixed(2)}`}
            icon="💰"
            trend="up"
          />
          <MetricCard
            label="Tips Received"
            value={`$${(data.summary.totalTips / 100).toFixed(2)}`}
            icon="💵"
            trend="up"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Booking Trend */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Booking Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trend}>
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
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cancellations"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Revenue Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Deposits', value: data.revenueBreakdown.deposits },
                    { name: 'Tips', value: data.revenueBreakdown.tips },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${(value / 100).toFixed(0)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip formatter={(value) => `$${(Number(value) / 100).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barber Performance */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Barber Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.barberPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
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
                <Bar dataKey="totalBookings" fill="#3b82f6" name="Bookings" />
                <Bar dataKey="completedBookings" fill="#10b981" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Peak Booking Hours</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Bar dataKey="bookings" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Days */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Busiest Days of Week</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.peakDays}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="bookings" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top Customers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-900">Email</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Bookings</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-900">Last Booking</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.email}</td>
                    <td className="text-right px-4 py-3">
                      <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold text-xs">
                        {customer.bookings}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 text-slate-600">
                      {new Date(customer.lastBooking).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
