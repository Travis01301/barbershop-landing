'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('ShiftTemplateBuilder')

interface ShiftTemplate {
  id: number
  name: string
  description?: string
  start_time: string
  end_time: string
  min_barbers_required: number
  max_barbers_allowed: number
  recurring_pattern?: string
  recurring_days?: string
  is_active: boolean
}

interface ShiftTemplateBuilderProps {
  shopId: number
  token: string
  onSuccess?: (template: ShiftTemplate) => void
  onCancel?: () => void
  initialTemplate?: ShiftTemplate
  isEditing?: boolean
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const RECURRING_PATTERNS = [
  { value: 'daily', label: 'Every Day' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekly', label: 'Weekly (specific days)' },
  { value: 'custom', label: 'Custom Pattern' },
]

export function ShiftTemplateBuilder({
  shopId,
  token,
  onSuccess,
  onCancel,
  initialTemplate,
  isEditing = false,
}: ShiftTemplateBuilderProps) {
  const [name, setName] = useState(initialTemplate?.name || '')
  const [description, setDescription] = useState(initialTemplate?.description || '')
  const [startTime, setStartTime] = useState(initialTemplate?.start_time || '09:00')
  const [endTime, setEndTime] = useState(initialTemplate?.end_time || '17:00')
  const [minBarbers, setMinBarbers] = useState(initialTemplate?.min_barbers_required || 1)
  const [maxBarbers, setMaxBarbers] = useState(initialTemplate?.max_barbers_allowed || 5)
  const [recurringPattern, setRecurringPattern] = useState(
    initialTemplate?.recurring_pattern || 'weekdays'
  )
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialTemplate?.recurring_days ? JSON.parse(initialTemplate.recurring_days) : [1, 2, 3, 4, 5]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDayToggle = (dayOfWeek: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek) ? prev.filter((d) => d !== dayOfWeek) : [...prev, dayOfWeek]
    )
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Template name is required')
      return false
    }

    if (startTime >= endTime) {
      setError('Start time must be before end time')
      return false
    }

    if (minBarbers > maxBarbers) {
      setError('Minimum barbers cannot exceed maximum')
      return false
    }

    if (recurringPattern === 'weekly' && selectedDays.length === 0) {
      setError('Select at least one day for weekly pattern')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing
        ? `/api/shifts/templates/${initialTemplate?.id}`
        : '/api/shifts/templates'

      const requestBody = {
        name,
        description: description || null,
        startTime,
        endTime,
        minBarbersRequired: minBarbers,
        maxBarbersAllowed: maxBarbers,
        recurringPattern,
        recurringDays: JSON.stringify(
          recurringPattern === 'weekly' || recurringPattern === 'custom' ? selectedDays : null
        ),
        isActive: true,
      }

      componentLogger.debug('Submitting template', { isEditing, template: requestBody })

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save template')
      }

      const data = await response.json()
      setSuccess(
        isEditing
          ? 'Shift template updated successfully!'
          : 'Shift template created successfully!'
      )

      // Reset form
      setName('')
      setDescription('')
      setStartTime('09:00')
      setEndTime('17:00')
      setMinBarbers(1)
      setMaxBarbers(5)
      setRecurringPattern('weekdays')
      setSelectedDays([1, 2, 3, 4, 5])

      if (onSuccess) {
        onSuccess(data.template)
      }

      componentLogger.info('Template saved', { templateId: data.template.id })
    } catch (err: any) {
      componentLogger.error('Error saving template:', err)
      setError(err.message || 'Failed to save template. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border rounded overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-b">
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit Shift Template' : 'Create Shift Template'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
          Define a recurring shift pattern that can be assigned to barbers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-4 text-red-700">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded p-4 text-green-700">
            {success}
          </div>
        )}

        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Morning Shift, Afternoon Shift"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this shift"
            rows={2}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Time Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              End Time *
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Barber Requirements */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Minimum Barbers *
            </label>
            <input
              type="number"
              min="1"
              value={minBarbers}
              onChange={(e) => setMinBarbers(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Maximum Barbers *
            </label>
            <input
              type="number"
              min="1"
              value={maxBarbers}
              onChange={(e) => setMaxBarbers(parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Recurring Pattern */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Recurring Pattern *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RECURRING_PATTERNS.map((pattern) => (
              <label key={pattern.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="pattern"
                  value={pattern.value}
                  checked={recurringPattern === pattern.value}
                  onChange={(e) => setRecurringPattern(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{pattern.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Day Selection (for weekly/custom patterns) */}
        {(recurringPattern === 'weekly' || recurringPattern === 'custom') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Select Days
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map((day, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(index)}
                    onChange={() => handleDayToggle(index)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Summary Preview */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Preview</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Time:</strong> {startTime} - {endTime}
            </p>
            <p>
              <strong>Coverage:</strong> {minBarbers}-{maxBarbers} barbers
            </p>
            <p>
              <strong>Pattern:</strong>{' '}
              {recurringPattern === 'daily'
                ? 'Every day'
                : recurringPattern === 'weekdays'
                  ? 'Monday - Friday'
                  : recurringPattern === 'weekly'
                    ? selectedDays.map((d) => DAYS[d]).join(', ')
                    : 'Custom'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
