'use client'

import { useState, useEffect } from 'react'

interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  appointmentId?: string
}

interface AvailabilityDay {
  date: string
  dayOfWeek: number
  slots: TimeSlot[]
  isWorkingDay: boolean
}

interface AvailabilityCalendarProps {
  barberId: number
  shopId: number
  startDate: string
  endDate: string
  slotDurationMinutes?: number
  onSlotSelect?: (slotStart: string, slotEnd: string) => void
  accessToken?: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function AvailabilityCalendar({
  barberId,
  shopId,
  startDate,
  endDate,
  slotDurationMinutes = 30,
  onSlotSelect,
  accessToken,
}: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    fetchAvailability()
  }, [barberId, shopId, startDate, endDate, slotDurationMinutes])

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        barberId: String(barberId),
        shopId: String(shopId),
        startDate,
        endDate,
        slotDurationMinutes: String(slotDurationMinutes),
      })

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(`/api/appointments/availability?${params}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch availability')
      }

      const data = await response.json()
      setAvailability(data.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch availability'
      setError(errorMessage)
      console.error('Error fetching availability:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) return

    setSelectedSlot(slot)
    if (onSlotSelect) {
      onSlotSelect(slot.startTime, slot.endTime)
    }
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading availability...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 font-semibold">Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAvailability}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  const availableCount = availability.reduce(
    (sum, day) => sum + day.slots.filter(s => s.isAvailable).length,
    0
  )

  return (
    <div className="w-full">
      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>{availableCount}</strong> available slots from{' '}
          <strong>{formatDateHeader(startDate)}</strong> to <strong>{formatDateHeader(endDate)}</strong>
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-6">
        {availability.map(day => (
          <div key={day.date} className="border rounded-lg p-4">
            {/* Day Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {DAY_NAMES[day.dayOfWeek]} - {formatDateHeader(day.date)}
              </h3>
              {!day.isWorkingDay && (
                <p className="text-sm text-gray-500 mt-1">Barber not working today</p>
              )}
            </div>

            {/* Time Slots */}
            {day.isWorkingDay && day.slots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {day.slots.map((slot, idx) => {
                  const isSelected =
                    selectedSlot &&
                    selectedSlot.startTime === slot.startTime &&
                    selectedSlot.endTime === slot.endTime

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSlotClick(slot)}
                      disabled={!slot.isAvailable}
                      className={`p-3 rounded text-sm font-medium transition ${
                        slot.isAvailable
                          ? isSelected
                            ? 'bg-green-600 text-white ring-2 ring-green-400'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={
                        slot.isAvailable
                          ? `Available: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
                          : `Booked: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
                      }
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  )
                })}
              </div>
            ) : day.isWorkingDay ? (
              <p className="text-gray-500 text-sm">No time slots available</p>
            ) : null}
          </div>
        ))}
      </div>

      {availability.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          <p>No availability data for the selected date range</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 border border-green-200 rounded"></div>
            <span>Available slot</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 text-white rounded flex items-center justify-center">
              ✓
            </div>
            <span>Selected slot</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded"></div>
            <span>Booked slot</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AvailabilityCalendar
