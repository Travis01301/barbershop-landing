'use client'

import { useState } from 'react'
import { Service } from '@/lib/services'

interface ServiceListProps {
  services: Service[]
  onEdit?: (service: Service) => void
  onDelete?: (serviceId: number) => void
  isLoading?: boolean
  layout?: 'table' | 'cards'
}

export function ServiceList({
  services,
  onEdit,
  onDelete,
  isLoading = false,
  layout = 'table'
}: ServiceListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (serviceId: number) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return
    }

    setDeletingId(serviceId)
    try {
      await onDelete?.(serviceId)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200">
        <p className="text-slate-600 dark:text-slate-400 font-medium">No services found</p>
        <p className="text-sm text-slate-500 mt-1">Create your first service to get started</p>
      </div>
    )
  }

  if (layout === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{service.name}</h3>
                {service.category && (
                  <p className="text-xs text-slate-500 mt-1">
                    {service.category}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  service.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800'
                }`}
              >
                {service.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {service.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{service.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-t border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-semibold text-slate-900">
                  ${service.price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-semibold text-slate-900">
                  {service.duration_minutes}m
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(service)}
                  className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded font-medium text-sm hover:bg-blue-100 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={deletingId === service.id}
                  className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === service.id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Table layout
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
              Category
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
              Price
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
              Duration
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr
              key={service.id}
              className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 transition-colors"
            >
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-slate-500 truncate">
                      {service.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {service.category || '-'}
              </td>
              <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 font-medium">
                ${service.price.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right text-slate-900">
                {service.duration_minutes}m
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    service.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800'
                  }`}
                >
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-2 justify-end">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(service)}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded text-sm hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deletingId === service.id}
                      className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded text-sm hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === service.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ServiceList
