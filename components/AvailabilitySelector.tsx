'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('AvailabilitySelector')

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DayAvailability {
  dayOfWeek: number
  isAvailable: boolean
  availabilityType: 'regular' | 'flexible' | 'unavailable'
  startTime?: string
  endTime?: string
  preferenceLevel: 'preferred' | 'willing' | 'unavailable'
}

interface AvailabilitySelectorProps {
  barberId: number
  shopId: number
  token: string
  onSave?: (availability: DayAvailability[]) => void
  initialAvailability?: DayAvailability[]
}

export function AvailabilitySelector({
  barberId,
  shopId,
  token,
  onSave,
  initialAvailability,
}: AvailabilitySelectorProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [loading, setLoading] = useState(!initialAvailability)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (initialAvailability) {
      setAvailability(initialAvailability)
    } else {
      fetchAvailability()
    }
  }, [barberId])

  const fetchAvailability = async () => {
    try {
      componentLogger.debug('Fetching barber availability', { barberId })
      const response = await fetch(`/api/availability?barberId=${barberId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch availability')
      }

      const data = await response.json()
      setAvailability(data.availability || initializeAvailability())
      setLoading(false)
    } catch (err) {
      componentLogger.error('Error fetching availability:', err)
      setError('Failed to load availability')
      setAvailability(initializeAvailability())
      setLoading(false)
    }
  }

  const initializeAvailability = (): DayAvailability[] => {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isAvailable: i >= 1 && i <= 5, // Monday-Friday
      availabilityType: 'flexible',
      startTime: '09:00',
      endTime: '17:00',
      preferenceLevel: 'willing',
    }))
  }

  const handleDayChange = (dayOfWeek: number, field: keyof DayAvailability, value: any) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [field]: value }
          : day
      )
    )
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      componentLogger.debug('Saving availability', { barberId })

      // Save each day's availability
      for (const day of availability) {
        const response = await fetch('/api/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            barberId,
            dayOfWeek: day.dayOfWeek,
            isAvailable: day.isAvailable,
            availabilityType: day.availabilityType,
            startTime: day.startTime || null,
            endTime: day.endTime || null,
            preferenceLevel: day.preferenceLevel,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save availability')
        }
      }

      setSuccess('Availability saved successfully!')
      if (onSave) {
        onSave(availability)
      }
      componentLogger.info('Availability saved', { barberId })
    } catch (err) {
      componentLogger.error('Error saving availability:', err)
      setError('Failed to save availability. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading availability...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-4 text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded p-4 text-green-700">{success}</div>
      )}

      <div className="bg-white dark:bg-slate-900 border rounded overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-b">
          <h2 className="text-lg font-semibold">Weekly Availability</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Set your availability for each day of the week
          </p>
        </div>

        <div className="divide-y">
          {availability.map((day) => (
            <div key={day.dayOfWeek} className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-medium">{DAYS[day.dayOfWeek]}</h3>
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={day.isAvailable}
                    onChange={(e) =>
                      handleDayChange(day.dayOfWeek, 'isAvailable', e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Available</span>
                </label>
              </div>

              {day.isAvailable && (
                <div className="grid grid-cols-3 gap-4 ml-6">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Type</label>
                    <select
                      value={day.availabilityType}
                      onChange={(e) =>
                        handleDayChange(
                          day.dayOfWeek,
                          'availabilityType',
                          e.target.value as any
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="regular">Regular</option>
                      <option value="flexible">Flexible</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">Preference</label>
                    <select
                      value={day.preferenceLevel}
                      onChange={(e) =>
                        handleDayChange(
                          day.dayOfWeek,
                          'preferenceLevel',
                          e.target.value as any
                        )
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="preferred">Preferred</option>
                      <option value="willing">Willing</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">From</label>
                      <input
                        type="time"
                        value={day.startTime || '09:00'}
                        onChange={(e) =>
                          handleDayChange(day.dayOfWeek, 'startTime', e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">To</label>
                      <input
                        type="time"
                        value={day.endTime || '17:00'}
                        onChange={(e) =>
                          handleDayChange(day.dayOfWeek, 'endTime', e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )
}
