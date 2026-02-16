'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface ReviewAnalytics {
  totalReviews: number
  averageRating: number
  fiveStarCount: number
  fourStarCount: number
  threeStarCount: number
  twoStarCount: number
  oneStarCount: number
  responseRate: number
  sentimentPositive: number
  sentimentNegative: number
  sentimentNeutral: number
}

interface DailyData {
  date: string
  totalReviews: number
  averageRating: number
  responseRate: number
}

interface ReviewAnalyticsProps {
  shopId: number
  barberId?: number
}

export default function ReviewAnalyticsComponent({ shopId, barberId }: ReviewAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const params = new URLSearchParams({ shopId: shopId.toString() })
        if (barberId) {
          params.append('barberId', barberId.toString())
        }

        const response = await fetch(`/api/reviews/analytics?${params}`)
        const data = await response.json()

        if (response.ok) {
          setAnalytics(data.summary)
          setDailyData(data.dailyData)
        } else {
          setError(data.error || 'Failed to fetch analytics')
        }
      } catch (err) {
        setError('Failed to fetch analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [shopId, barberId])

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>
  }

  const ratingDistribution = [
    { name: '5 Stars', value: analytics.fiveStarCount, color: '#10b981' },
    { name: '4 Stars', value: analytics.fourStarCount, color: '#3b82f6' },
    { name: '3 Stars', value: analytics.threeStarCount, color: '#f59e0b' },
    { name: '2 Stars', value: analytics.twoStarCount, color: '#ef4444' },
    { name: '1 Star', value: analytics.oneStarCount, color: '#991b1b' },
  ]

  const sentimentData = [
    { name: 'Positive', value: analytics.sentimentPositive, color: '#10b981' },
    { name: 'Neutral', value: analytics.sentimentNeutral, color: '#6b7280' },
    { name: 'Negative', value: analytics.sentimentNegative, color: '#ef4444' },
  ]

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Reviews</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalReviews}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Average Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900">{analytics.averageRating.toFixed(1)}</p>
            <span className="text-2xl">★</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Response Rate</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.responseRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Sentiment</p>
          <p className="text-sm mt-2">
            <span className="text-green-600 font-medium">{analytics.sentimentPositive}</span>
            {' '} positive
          </p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ratingDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6">
              {ratingDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Chart */}
        {dailyData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Rating Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="averageRating"
                  stroke="#3b82f6"
                  name="Average Rating"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
