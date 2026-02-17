'use client'

import { useState, useEffect } from 'react'

interface CustomerProfileProps {
  customerId: number
  token: string
}

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  preferred_barber_id: number
  styling_notes: string
  allergies: string
  health_notes: string
  preferred_contact_method: string
  do_not_disturb_time: string
  total_appointments: number
  last_visit_date: string
  created_at: string
  updated_at: string
}

export function CustomerProfile({ customerId, token }: CustomerProfileProps) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomer()
  }, [customerId, token])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch customer')
      }

      const data = await response.json()
      if (data.success) {
        setCustomer(data.customer)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error loading customer</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Customer not found</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">Customer Profile</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase mb-4">
            Contact Information
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
              <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
              <p className="text-sm text-gray-700 dark:text-slate-300 break-all">{customer.email}</p>
            </div>
            {customer.phone && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
                <p className="text-sm text-gray-700">{customer.phone}</p>
              </div>
            )}
            {customer.address && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                <p className="text-sm text-gray-700">{customer.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase mb-4">
            Appointment History
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 uppercase">Total Appointments</p>
              <p className="text-3xl font-bold text-blue-900">
                {customer.total_appointments || 0}
              </p>
            </div>
            {customer.last_visit_date && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-xs font-medium text-green-600 uppercase">Last Visit</p>
                <p className="text-lg font-semibold text-green-900">
                  {formatDate(customer.last_visit_date)}
                </p>
              </div>
            )}
            {customer.preferred_contact_method && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Preferred Contact
                </p>
                <p className="text-sm text-gray-700 dark:text-slate-300 capitalize">
                  {customer.preferred_contact_method}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Preferences */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase mb-4">
          Customer Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customer.styling_notes && (
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 dark:text-slate-400 uppercase mb-2">
                Styling Notes
              </p>
              <p className="text-sm text-gray-700">{customer.styling_notes}</p>
            </div>
          )}
          {customer.allergies && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-xs font-medium text-red-600 uppercase mb-2">Allergies</p>
              <p className="text-sm text-red-700">{customer.allergies}</p>
            </div>
          )}
          {customer.health_notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-xs font-medium text-yellow-600 uppercase mb-2">
                Health Notes
              </p>
              <p className="text-sm text-yellow-700">{customer.health_notes}</p>
            </div>
          )}
          {customer.do_not_disturb_time && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-xs font-medium text-purple-600 uppercase mb-2">
                Do Not Disturb
              </p>
              <p className="text-sm text-purple-700">{customer.do_not_disturb_time}</p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-8 pt-6 border-t text-xs text-gray-500">
        <p>
          Member since {formatDate(customer.created_at)} • Last updated{' '}
          {formatDate(customer.updated_at)}
        </p>
      </div>
    </div>
  )
}
