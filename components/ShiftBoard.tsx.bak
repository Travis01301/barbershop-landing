'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('ShiftBoard')

interface Shift {
  id: number
  barber_id: number
  barber_name: string
  shift_date: string
  start_time: string
  end_time: string
  status: string
}

interface CoverageStatus {
  shiftDate: string
  startTime: string
  endTime: string
  assignedBarbers: number
  minimumRequired: number
  status: 'covered' | 'understaffed' | 'overstaffed'
}

interface ShiftBoardProps {
  shopId: number
  token: string
  startDate: string
  endDate: string
  viewMode?: 'week' | 'month'
  onShiftClick?: (shift: Shift) => void
  onCoverageUpdate?: (coverage: CoverageStatus[]) => void
}

export function ShiftBoard({
  shopId,
  token,
  startDate,
  endDate,
  viewMode = 'week',
  onShiftClick,
  onCoverageUpdate,
}: ShiftBoardProps) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [coverage, setCoverage] = useState<CoverageStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(startDate)

  useEffect(() => {
    fetchShiftBoard()
    fetchCoverage()
  }, [startDate, endDate])

  const fetchShiftBoard = async () => {
    try {
      componentLogger.debug('Fetching shift board', { startDate, endDate })
      const response = await fetch(
        `/api/shifts/board?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch shifts')
      }

      const data = await response.json()
      setShifts(data.shifts || [])
      componentLogger.debug('Shift board loaded', { count: data.shifts?.length })
    } catch (err) {
      componentLogger.error('Error fetching shift board:', err)
      setError('Failed to load shift board')
    }
  }

  const fetchCoverage = async () => {
    try {
      const response = await fetch(
        `/api/shifts/coverage?startDate=${startDate}&endDate=${endDate}&includeDetails=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch coverage')
      }

      const data = await response.json()
      setCoverage(data.coverage || [])
      if (onCoverageUpdate) {
        onCoverageUpdate(data.coverage)
      }
    } catch (err) {
      componentLogger.error('Error fetching coverage:', err)
    } finally {
      setLoading(false)
    }
  }

  const getShiftColor = (shift: Shift): string => {
    switch (shift.status) {
      case 'assigned':
        return 'bg-blue-100 border-blue-300'
      case 'confirmed':
        return 'bg-green-100 border-green-300'
      case 'pending':
        return 'bg-yellow-100 border-yellow-300'
      case 'cancelled':
        return 'bg-red-100 border-red-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const getCoverageColor = (status: string): string => {
    switch (status) {
      case 'covered':
        return 'text-green-600 bg-green-50'
      case 'understaffed':
        return 'text-red-600 bg-red-50'
      case 'overstaffed':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600'
    }
  }

  const groupShiftsByDate = () => {
    const grouped: { [key: string]: Shift[] } = {}
    shifts.forEach((shift) => {
      if (!grouped[shift.shift_date]) {
        grouped[shift.shift_date] = []
      }
      grouped[shift.shift_date].push(shift)
    })
    return grouped
  }

  const groupCoverageByTime = () => {
    const grouped: { [key: string]: CoverageStatus[] } = {}
    coverage.forEach((cov) => {
      const timeKey = `${cov.startTime}-${cov.endTime}`
      if (!grouped[timeKey]) {
        grouped[timeKey] = []
      }
      grouped[timeKey].push(cov)
    })
    return grouped
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading shift board...</div>
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
  }

  const shiftsByDate = groupShiftsByDate()
  const coverageByTime = groupCoverageByTime()

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-sm text-gray-600">Total Shifts</div>
          <div className="text-2xl font-bold">{coverage.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="text-sm text-green-600">Covered</div>
          <div className="text-2xl font-bold text-green-700">
            {coverage.filter((c) => c.status === 'covered').length}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="text-sm text-red-600">Understaffed</div>
          <div className="text-2xl font-bold text-red-700">
            {coverage.filter((c) => c.status === 'understaffed').length}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded p-4">
          <div className="text-sm text-orange-600">Overstaffed</div>
          <div className="text-2xl font-bold text-orange-700">
            {coverage.filter((c) => c.status === 'overstaffed').length}
          </div>
        </div>
      </div>

      {/* Shift Calendar */}
      <div className="bg-white border rounded overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">Shift Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-4 py-2 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Time</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Barber</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(shiftsByDate).map(([date, dayShifts]) => (
                <React.Fragment key={date}>
                  {dayShifts.map((shift, index) => (
                    <tr
                      key={shift.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${getShiftColor(shift)}`}
                      onClick={() => onShiftClick?.(shift)}
                    >
                      <td className="px-4 py-3 text-sm">{index === 0 ? date : ''}</td>
                      <td className="px-4 py-3 text-sm">
                        {shift.start_time} - {shift.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{shift.barber_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium capitalize">
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {coverage.find(
                          (c) =>
                            c.shiftDate === date &&
                            c.startTime === shift.start_time &&
                            c.endTime === shift.end_time
                        ) && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCoverageColor(
                            coverage.find(
                              (c) =>
                                c.shiftDate === date &&
                                c.startTime === shift.start_time &&
                                c.endTime === shift.end_time
                            )?.status || ''
                          )}`}>
                            {coverage.find(
                              (c) =>
                                c.shiftDate === date &&
                                c.startTime === shift.start_time &&
                                c.endTime === shift.end_time
                            )?.assignedBarbers}/{coverage.find(
                              (c) =>
                                c.shiftDate === date &&
                                c.startTime === shift.start_time &&
                                c.endTime === shift.end_time
                            )?.minimumRequired}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coverage Timeline */}
      <div className="bg-white border rounded overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">Coverage by Time Slot</h2>
        </div>
        <div className="p-4">
          {Object.entries(coverageByTime).map(([timeSlot, timeCoverage]) => (
            <div key={timeSlot} className="mb-4 pb-4 border-b last:border-b-0">
              <div className="font-semibold mb-2">{timeSlot}</div>
              <div className="space-y-2">
                {timeCoverage.map((cov) => (
                  <div
                    key={`${cov.shiftDate}-${timeSlot}`}
                    className={`flex justify-between items-center px-3 py-2 rounded ${getCoverageColor(cov.status)}`}
                  >
                    <span>{cov.shiftDate}</span>
                    <span className="font-medium">
                      {cov.assignedBarbers}/{cov.minimumRequired} {cov.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
