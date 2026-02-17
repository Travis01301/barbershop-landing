'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('CoverageStats')

interface CoverageStatsProps {
  shopId: number
  token: string
  startDate: string
  endDate: string
  onRefresh?: () => void
}

interface Coverage {
  totalShifts: number
  coveredShifts: number
  understaffedShifts: number
  overstaffedShifts: number
  coveragePercentage: number
  avgBarbersPerShift: string
}

export function CoverageStats({
  shopId,
  token,
  startDate,
  endDate,
  onRefresh,
}: CoverageStatsProps) {
  const [stats, setStats] = useState<Coverage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [startDate, endDate])

  const fetchStats = async () => {
    try {
      componentLogger.debug('Fetching coverage stats', { startDate, endDate })
      setLoading(true)

      const response = await fetch(
        `/api/shifts/coverage?startDate=${startDate}&endDate=${endDate}&includeDetails=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch coverage stats')
      }

      const data = await response.json()
      setStats(data.stats)
      setError(null)
      componentLogger.debug('Coverage stats loaded', { stats: data.stats })
    } catch (err) {
      componentLogger.error('Error fetching coverage stats:', err)
      setError('Failed to load coverage statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading statistics...</div>
  }

  if (error || !stats) {
    return <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-4 text-red-700">{error}</div>
  }

  const healthScore = Math.round((stats.coveredShifts / stats.totalShifts) * 100) || 0

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 mb-2">Coverage Health Score</p>
            <div className="text-4xl font-bold">{healthScore}%</div>
            <p className="text-blue-100 text-sm mt-1">Overall shift coverage</p>
          </div>
          <div className="text-6xl opacity-20">✓</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Shifts */}
        <div className="bg-white dark:bg-slate-900 border rounded p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-2">Total Shifts</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalShifts}</div>
          <div className="text-xs text-gray-500 mt-2">Period: {startDate} to {endDate}</div>
        </div>

        {/* Covered */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded p-4">
          <div className="text-sm text-green-700 font-medium mb-2">Fully Covered</div>
          <div className="text-3xl font-bold text-green-700">{stats.coveredShifts}</div>
          <div className="text-xs text-green-600 mt-2">
            {stats.totalShifts > 0
              ? Math.round((stats.coveredShifts / stats.totalShifts) * 100)
              : 0}% of shifts
          </div>
        </div>

        {/* Understaffed */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-4">
          <div className="text-sm text-red-700 font-medium mb-2">Understaffed</div>
          <div className="text-3xl font-bold text-red-700">{stats.understaffedShifts}</div>
          <div className="text-xs text-red-600 mt-2">
            {stats.totalShifts > 0
              ? Math.round((stats.understaffedShifts / stats.totalShifts) * 100)
              : 0}% of shifts
          </div>
        </div>

        {/* Overstaffed */}
        <div className="bg-orange-50 border border-orange-200 rounded p-4">
          <div className="text-sm text-orange-700 font-medium mb-2">Overstaffed</div>
          <div className="text-3xl font-bold text-orange-700">{stats.overstaffedShifts}</div>
          <div className="text-xs text-orange-600 mt-2">
            {stats.totalShifts > 0
              ? Math.round((stats.overstaffedShifts / stats.totalShifts) * 100)
              : 0}% of shifts
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white dark:bg-slate-900 border rounded p-6">
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600">Average Barbers per Shift</span>
            <span className="text-lg font-semibold">{stats.avgBarbersPerShift}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Coverage Rate</span>
            <span className="text-lg font-semibold text-green-600">{stats.coveragePercentage}%</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {stats.understaffedShifts > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded p-4">
          <div className="flex gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Action Required</h4>
              <p className="text-sm text-yellow-800">
                You have {stats.understaffedShifts} understaffed shift
                {stats.understaffedShifts !== 1 ? 's' : ''}. Consider requesting additional barbers or
                adjusting your shift times.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.coveredShifts === stats.totalShifts && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded p-4">
          <div className="flex gap-3">
            <div className="text-2xl">✓</div>
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Great Job!</h4>
              <p className="text-sm text-green-800">
                All shifts during this period are fully covered. Your schedule is well-balanced.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="w-full px-4 py-2 border rounded hover:bg-gray-50 dark:bg-slate-900 font-medium text-gray-700"
        >
          Refresh Stats
        </button>
      )}
    </div>
  )
}
