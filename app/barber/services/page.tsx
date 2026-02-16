'use client'

import { useState, useEffect } from 'react'
import { Service, ServiceManager } from '@/lib/services'
import ServiceForm, { ServiceFormData } from '@/components/ServiceForm'
import ServiceList from '@/components/ServiceList'

export default function BarberServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shopId, setShopId] = useState<number | null>(null)
  const [barberId, setBarberId] = useState<number | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load user and shop info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        // Get from localStorage or from auth API
        const shopIdStr = localStorage.getItem('shopId')
        const barberIdStr = localStorage.getItem('barberId')

        if (shopIdStr) {
          setShopId(parseInt(shopIdStr))
        }
        if (barberIdStr) {
          setBarberId(parseInt(barberIdStr))
        }
      } catch (err) {
        console.error('Error loading user info:', err)
      }
    }

    loadUserInfo()
  }, [])

  // Fetch services and categories
  useEffect(() => {
    if (!shopId) return

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('authToken') || ''
        
        // Fetch services for the shop
        const servicesResponse = await fetch(
          `/api/services?shopId=${shopId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!servicesResponse.ok) {
          throw new Error('Failed to load services')
        }

        const servicesData = await servicesResponse.json()
        setServices(servicesData.services || [])

        // Extract unique categories
        const cats = Array.from(
          new Set(
            servicesData.services
              ?.filter((s: Service) => s.category)
              .map((s: Service) => s.category)
          )
        ) as string[]
        setCategories(cats)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load services'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [shopId])

  const filteredServices = filterCategory
    ? services.filter((s) => s.category === filterCategory)
    : services

  const handleCreateService = async (data: ServiceFormData) => {
    if (!shopId) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('authToken') || ''

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          base_price: data.price,
          duration_minutes: data.duration_minutes,
          category: data.category || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create service')
      }

      const result = await response.json()
      setServices([...services, result.service])
      setShowForm(false)

      // Update categories
      if (data.category && !categories.includes(data.category)) {
        setCategories([...categories, data.category])
      }
    } catch (err) {
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateService = async (data: ServiceFormData) => {
    if (!shopId || !editingService) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('authToken') || ''

      const response = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: data.price,
          duration_minutes: data.duration_minutes,
          category: data.category || undefined,
          is_active: data.is_active
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update service')
      }

      const result = await response.json()
      setServices(
        services.map((s) => (s.id === editingService.id ? result.service : s))
      )
      setEditingService(null)
      setShowForm(false)
    } catch (err) {
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!shopId) return

    try {
      const token = localStorage.getItem('authToken') || ''

      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to delete service')
      }

      setServices(services.filter((s) => s.id !== serviceId))
    } catch (err) {
      throw err
    }
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingService(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Services</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your barbershop services and pricing
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                + Add Service
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Form Section */}
        {showForm && (
          <div className="mb-8">
            <ServiceForm
              service={editingService}
              onSubmit={editingService ? handleUpdateService : handleCreateService}
              onCancel={handleCloseForm}
              isLoading={isSubmitting}
              categories={categories}
            />
          </div>
        )}

        {/* Error Message */}
        {error && !showForm && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {error}
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && !isLoading && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                filterCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Services List */}
        <ServiceList
          services={filteredServices}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          isLoading={isLoading}
          layout="cards"
        />

        {/* Empty State */}
        {!isLoading && services.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m0 0h6m0 0h-6m0 0h-6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No services yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create your first service to get started
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Create Service
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
