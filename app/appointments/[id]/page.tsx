'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface Appointment {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  start_time: string
  end_time: string
  status: string
  barber_name: string
  barber_id: number
  shop_name: string
  shop_id: number
}

interface AvailableSlot {
  startTime: string
  endTime: string
}

export default function ManageAppointment() {
  const params = useParams()
  const searchParams = useSearchParams()
  const appointmentId = params.id as string
  const token = searchParams.get('token') as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid access link. Please use the link from your booking confirmation email.')
      setLoading(false)
      return
    }

    fetchAppointment()
  }, [appointmentId, token])

  const fetchAppointment = async () => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/details?token=${encodeURIComponent(token)}`
      )
      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to load appointment')
        setLoading(false)
        return
      }

      setAppointment(data.appointment)
      // Set default reschedule date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setRescheduleDate(tomorrow.toISOString().split('T')[0])
      setLoading(false)
    } catch (err) {
      setError('Failed to load appointment. Please try again.')
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    if (!rescheduleDate || !appointment) return

    setLoadingSlots(true)
    try {
      const response = await fetch(
        `/api/available-slots?shopId=${appointment.shop_id}&barberId=${appointment.barber_id}&date=${rescheduleDate}`
      )
      const data = await response.json()

      if (data.success && data.availableSlots) {
        setAvailableSlots(data.availableSlots)
      } else {
        setAvailableSlots([])
      }
    } catch (err) {
      console.error('Error fetching slots:', err)
      setAvailableSlots([])
    }
    setLoadingSlots(false)
  }

  useEffect(() => {
    if (mode === 'reschedule' && rescheduleDate) {
      fetchAvailableSlots()
    }
  }, [rescheduleDate, mode])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason: cancelReason,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setMode('view')
        // Refresh appointment
        setTimeout(() => fetchAppointment(), 1000)
      } else {
        setError(data.error || 'Failed to cancel appointment')
      }
    } catch (err) {
      setError('Error cancelling appointment. Please try again.')
    }
    setSubmitting(false)
  }

  const handleReschedule = async () => {
    if (!rescheduleTime) {
      setError('Please select a time')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newDate: rescheduleDate,
          newTime: rescheduleTime,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setMode('view')
        // Refresh appointment
        setTimeout(() => fetchAppointment(), 1000)
      } else {
        setError(data.error || 'Failed to reschedule appointment')
      }
    } catch (err) {
      setError('Error rescheduling appointment. Please try again.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-700 font-semibold text-lg">Loading your appointment...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  if (!appointment && error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center border border-slate-200">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M5.172 5.172a4 4 0 015.656 0L12 6.343l1.172-1.171a4 4 0 115.656 5.656L12 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Unable to Load</h1>
            <p className="text-slate-600 text-lg mb-4">{error}</p>
            <p className="text-sm text-slate-500">
              If you need help, please contact the barbershop directly.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return null
  }

  const appointmentDate = new Date(appointment.start_time)
  const dateStr = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const isPast = new Date(appointment.start_time) < new Date()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-4">
      <div className="max-w-3xl mx-auto">
        {success && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4 rounded-xl animate-in fade-in slide-in-from-top">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-800 font-semibold">Success! Changes have been saved.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 p-4 rounded-xl animate-in fade-in slide-in-from-top">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8">
            <h1 className="text-4xl font-bold mb-2">Manage Your Appointment</h1>
            <p className="text-slate-300 text-lg">View, reschedule, or cancel your booking</p>
          </div>

          {/* Appointment Details */}
          <div className="p-8 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointment Details
                </h2>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Date</p>
                    <p className="text-lg font-bold text-slate-900">{dateStr}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Time</p>
                    <p className="text-2xl font-bold text-blue-600">{timeStr}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Barber</p>
                    <p className="text-lg font-bold text-slate-900">{appointment.barber_name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Location</p>
                    <p className="text-lg font-bold text-slate-900">{appointment.shop_name}</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Your Information
                </h2>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Name</p>
                    <p className="text-lg font-bold text-slate-900">{appointment.customer_name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Email</p>
                    <p className="text-lg font-bold text-slate-900 break-all">{appointment.customer_email}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Phone</p>
                    <p className="text-lg font-bold text-slate-900">{appointment.customer_phone}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">Status</p>
                    <p className={`text-lg font-bold ${
                      appointment.status === 'cancelled'
                        ? 'text-red-600'
                        : appointment.status === 'confirmed'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {appointment.status !== 'cancelled' && !isPast && (
            <div className="p-8 bg-slate-50 border-t border-slate-200">
              {mode === 'view' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setMode('reschedule')
                      setError('')
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Reschedule
                  </button>
                  <button
                    onClick={() => {
                      setMode('cancel')
                      setError('')
                    }}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              )}

              {mode === 'reschedule' && (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="font-bold text-slate-900 text-xl">Select New Date & Time</h3>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">
                      New Time *
                    </label>
                    {loadingSlots ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold text-blue-700">Loading available times...</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm font-semibold text-red-700 p-4 bg-red-50 rounded-lg border border-red-200">
                        No available times for this date. Please choose another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot) => {
                          const slotTime = new Date(slot.startTime)
                          const timeDisplay = slotTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                          const timeValue = slotTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setRescheduleTime(timeValue)}
                              className={`p-3 rounded-lg text-sm font-bold transition-all border-2 ${
                                rescheduleTime === timeValue
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-300 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {timeDisplay}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleReschedule}
                      disabled={submitting || !rescheduleTime}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Updating...
                        </div>
                      ) : (
                        'Confirm Reschedule'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('view')
                        setError('')
                        setRescheduleTime('')
                      }}
                      className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 py-3 rounded-lg font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {mode === 'cancel' && (
                <div className="space-y-6 max-w-2xl">
                  <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                    <h3 className="font-bold text-red-900 text-lg mb-2">Cancel Appointment</h3>
                    <p className="text-red-700">
                      Are you sure you want to cancel? You can reschedule instead if you prefer a different time.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                      Reason (optional)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Tell us why you're cancelling (this helps us improve)..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleCancel}
                      disabled={submitting}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Cancelling...
                        </div>
                      ) : (
                        'Confirm Cancellation'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setMode('view')
                        setError('')
                        setCancelReason('')
                      }}
                      className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-900 py-3 rounded-lg font-bold transition-all"
                    >
                      Keep Appointment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancelled/Past Info */}
          {(appointment.status === 'cancelled' || isPast) && (
            <div className="p-8 bg-slate-50 border-t border-slate-200 text-center">
              {appointment.status === 'cancelled' && (
                <div>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Appointment Cancelled</h3>
                  <p className="text-slate-600 mb-6">This appointment has been cancelled and cannot be modified.</p>
                  <a href={`/book/${appointment.shop_name}`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Book a New Appointment
                  </a>
                </div>
              )}
              {isPast && (
                <div>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Appointment Completed</h3>
                  <p className="text-slate-600 mb-6">Thank you for visiting! This appointment is in the past.</p>
                  <a href={`/book/${appointment.shop_name}`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Book Again
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-8 bg-blue-50 border-t border-slate-200 text-center">
            <p className="text-slate-700 font-semibold">Need help?</p>
            <p className="text-slate-600 text-sm mt-2">Contact {appointment.shop_name} directly using the information in your confirmation email.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
