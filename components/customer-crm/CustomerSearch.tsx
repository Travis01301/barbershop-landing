'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface CustomerSearchProps {
  token: string
  onSelectCustomer?: (customerId: number) => void
}

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  total_appointments: number
  last_visit_date: string
}

export function CustomerSearch({ token, onSelectCustomer }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noResults, setNoResults] = useState(false)

  // Fetch all customers on mount
  useEffect(() => {
    fetchAllCustomers()
  }, [token])

  // Filter customers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers)
      setNoResults(false)
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (customer.phone && customer.phone.includes(term))
      )
      setFilteredCustomers(filtered)
      setNoResults(filtered.length === 0)
    }
  }, [searchTerm, customers])

  const fetchAllCustomers = async () => {
    try {
      setInitialLoading(true)
      setError(null)

      const response = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }

      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setInitialLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleCustomerSelect = (customerId: number) => {
    if (onSelectCustomer) {
      onSelectCustomer(customerId)
    }
  }

  if (initialLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error loading customers</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAllCustomers}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Customers</h2>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900 placeholder-gray-500 transition-colors"
          />
          <svg
            className="absolute right-4 top-3.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {searchTerm.trim() === ''
            ? `Showing all customers (${customers.length})`
            : `Found ${filteredCustomers.length} customer${
                filteredCustomers.length !== 1 ? 's' : ''
              }`}
        </p>
      </div>

      {/* Results */}
      {customers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No customers yet. They'll appear here when you receive bookings.</p>
        </div>
      ) : noResults ? (
        <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 font-medium">No customers match "{searchTerm}"</p>
          <p className="text-yellow-600 text-sm mt-1">Try searching with different terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {customer.name}
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600 truncate">
                      📧 {customer.email}
                    </p>
                    {customer.phone && (
                      <p className="text-sm text-gray-600">
                        ☎️ {customer.phone}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4 flex-wrap">
                    <div className="text-sm">
                      <span className="text-gray-500">Appointments:</span>
                      <span className="ml-1 font-semibold text-blue-600">
                        {customer.total_appointments || 0}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Last Visit:</span>
                      <span className="ml-1 font-semibold text-green-600">
                        {formatDate(customer.last_visit_date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
                  >
                    View Profile
                  </Link>
                  {onSelectCustomer && (
                    <button
                      onClick={() => handleCustomerSelect(customer.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {customers.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 uppercase">Total Customers</p>
              <p className="text-2xl font-bold text-blue-900">{customers.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs font-medium text-green-600 uppercase">With Appointments</p>
              <p className="text-2xl font-bold text-green-900">
                {customers.filter((c) => c.total_appointments > 0).length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs font-medium text-purple-600 uppercase">Total Appointments</p>
              <p className="text-2xl font-bold text-purple-900">
                {customers.reduce((sum, c) => sum + (c.total_appointments || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
