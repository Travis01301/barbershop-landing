'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('TimeOffRequestForm')

interface TimeOffRequestFormProps {
  barberId: number
  shopId: number
  token: string
  onSuccess?: (request: any) => void
  onCancel?: () => void
}

export function TimeOffRequestForm({
  barberId,
  shopId,
  token,
  onSuccess,
  onCancel,
}: TimeOffRequestFormProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('personal')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate dates
      if (!startDate || !endDate) {
        setError('Both start and end dates are required')
        setLoading(false)
        return
      }

      const start = new Date(startDate)
      const end = new Date(endDate)

      if (start > end) {
        setError('Start date must be before end date')
        setLoading(false)
        return
      }

      if (start < new Date()) {
        setError('Cannot request time-off in the past')
        setLoading(false)
        return
      }

      componentLogger.debug('Requesting time-off', {
        barberId,
        startDate,
        endDate,
        reason,
      })

      const response = await fetch('/api/time-off', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barberId,
          startDate,
          endDate,
          reason: reason || null,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to request time-off')
      }

      const data = await response.json()
      componentLogger.info('Time-off requested', { requestId: data.request.id })

      // Reset form
      setStartDate('')
      setEndDate('')
      setReason('personal')
      setDescription('')

      if (onSuccess) {
        onSuccess(data.request)
      }
    } catch (err: any) {
      componentLogger.error('Error requesting time-off:', err)
      setError(err.message || 'Failed to request time-off. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold">Request Time Off</h2>
        <p className="text-sm text-gray-600 mt-1">
          Submit a request for vacation, sick leave, or personal time
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={startDate || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="vacation">Vacation</option>
            <option value="sick">Sick Leave</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional details..."
            rows={3}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {startDate && endDate && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-700">
              <strong>Duration:</strong> {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
