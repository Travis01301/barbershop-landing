'use client'

import { useState, useEffect } from 'react'
import { Service } from '@/lib/services'

interface ServiceFormProps {
  service?: Service | null
  onSubmit: (data: ServiceFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  categories?: string[]
}

export interface ServiceFormData {
  name: string
  description?: string
  price: number
  duration_minutes: number
  category?: string
  is_active: boolean
}

export function ServiceForm({
  service,
  onSubmit,
  onCancel,
  isLoading = false,
  categories = []
}: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    category: '',
    is_active: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price,
        duration_minutes: service.duration_minutes,
        category: service.category || '',
        is_active: service.is_active
      })
    }
  }, [service])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required'
    }
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }
    if (formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formData)
      setErrors({})
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      setErrors({ submit: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        {service ? 'Edit Service' : 'Create New Service'}
      </h2>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-red-800 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Service Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-4 py-2 rounded border ${
              errors.name ? 'border-red-500' : 'border-slate-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="e.g., Haircut, Beard Trim"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="">Other</option>
          </select>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Price ($) *
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className={`w-full px-4 py-2 rounded border ${
              errors.price ? 'border-red-500' : 'border-slate-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-sm text-red-600 mt-1">{errors.price}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Duration (minutes) *
          </label>
          <input
            id="duration"
            type="number"
            min="5"
            step="5"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
            className={`w-full px-4 py-2 rounded border ${
              errors.duration_minutes ? 'border-red-500' : 'border-slate-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="30"
          />
          {errors.duration_minutes && (
            <p className="text-sm text-red-600 mt-1">{errors.duration_minutes}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Service description or notes"
          rows={3}
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
        </label>
        <p className="text-sm text-slate-500">
          {formData.is_active ? 'Service is available for booking' : 'Service is hidden'}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || isLoading}
          className="px-6 py-2 rounded border border-slate-300 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || isLoading}
          className="px-6 py-2 rounded bg-blue-600 font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
        </button>
      </div>
    </form>
  )
}

export default ServiceForm
