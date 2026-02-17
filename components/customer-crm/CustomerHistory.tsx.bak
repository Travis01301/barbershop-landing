'use client'

import { useState, useEffect } from 'react'

interface CustomerHistoryProps {
  customerId: number
  token: string
}

interface Appointment {
  id: number
  date: string
  barber_name: string
  status: string
  notes: string
  service?: string
  amount?: number
}

export function CustomerHistory({ customerId, token }: CustomerHistoryProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all')

  useEffect(() => {
    fetchAppointments()
  }, [customerId, token])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch appointment history')
      }

      const data = await response.json()
      if (data.success && data.customer.appointment_history) {
        setAppointments(data.customer.appointment_history)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    }
    const style = statusMap[status] || statusMap['pending']
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'all') return true
    if (filter === 'completed') return apt.status === 'completed' || apt.status === 'confirmed'
    if (filter === 'cancelled') return apt.status === 'cancelled'
    return true
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error loading appointment history</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Appointment History</h2>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['all', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === f
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-xs text-gray-500">
              ({appointments.filter((a) => 
                f === 'all' ? true : 
                f === 'completed' ? (a.status === 'completed' || a.status === 'confirmed') : 
                a.status === 'cancelled'
              ).length})
            </span>
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {appointments.length === 0
              ? 'No appointments yet'
              : `No ${filter} appointments`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {apt.barber_name || 'Unknown Barber'}
                    </span>
                    {getStatusBadge(apt.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatDateTime(apt.date)}
                  </p>
                  {apt.service && (
                    <p className="text-sm font-medium text-blue-600 mb-1">
                      Service: {apt.service}
                    </p>
                  )}
                  {apt.amount && (
                    <p className="text-sm font-semibold text-green-600 mb-1">
                      Amount Paid: ${(apt.amount / 100).toFixed(2)}
                    </p>
                  )}
                  {apt.notes && (
                    <p className="text-sm text-gray-700 mt-2 italic">
                      Notes: {apt.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {appointments.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">
            Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 uppercase">Total Appointments</p>
              <p className="text-2xl font-bold text-blue-900">{appointments.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs font-medium text-green-600 uppercase">Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {appointments.filter(
                  (a) => a.status === 'completed' || a.status === 'confirmed'
                ).length}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs font-medium text-red-600 uppercase">Cancelled</p>
              <p className="text-2xl font-bold text-red-900">
                {appointments.filter((a) => a.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
