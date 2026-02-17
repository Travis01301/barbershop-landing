'use client'

import { useState, useEffect } from 'react'
import { Service } from '@/lib/services'

interface ServiceSelectorProps {
  shopId: number
  barberId?: number
  selectedServiceId?: number
  onSelect: (service: Service | null) => void
  isLoading?: boolean
  label?: string
  required?: boolean
}

export function ServiceSelector({
  shopId,
  barberId,
  selectedServiceId,
  onSelect,
  isLoading: externalLoading = false,
  label = 'Select Service',
  required = true
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const url = barberId
          ? `/api/barbers/${barberId}/services`
          : `/api/services?shopId=${shopId}`

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch services')
        }

        const data = await response.json()
        const serviceList = data.services || []
        setServices(serviceList)

        // If a service was pre-selected, find it in the list
        if (selectedServiceId) {
          const service = serviceList.find((s: Service) => s.id === selectedServiceId)
          if (service) {
            setSelectedService(service)
            onSelect(service)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load services'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    if (shopId) {
      fetchServices()
    }
  }, [shopId, barberId, selectedServiceId, onSelect])

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = parseInt(e.target.value)
    if (!serviceId) {
      setSelectedService(null)
      onSelect(null)
      return
    }

    const service = services.find((s) => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      onSelect(service)
    }
  }

  if (externalLoading || isLoading) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          {label}
        </label>
        <div className="w-full px-4 py-2 rounded border border-slate-300 bg-slate-50 dark:bg-slate-900 text-slate-500">
          Loading services...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          {label}
        </label>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
          {label}
        </label>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded text-yellow-700 text-sm">
          No services available
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>

      <select
        value={selectedService?.id || ''}
        onChange={handleServiceChange}
        className="w-full px-4 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        required={required}
      >
        <option value="">
          {required ? 'Choose a service...' : 'None'}
        </option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name} - ${service.price.toFixed(2)} ({service.duration_minutes}m)
          </option>
        ))}
      </select>

      {selectedService && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-slate-900">{selectedService.name}</p>
              {selectedService.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedService.description}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-blue-100">
            <div>
              <p className="text-xs text-slate-600">Price</p>
              <p className="font-bold text-lg text-slate-900">
                ${selectedService.price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Duration</p>
              <p className="font-bold text-lg text-slate-900">
                {selectedService.duration_minutes} minutes
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceSelector
