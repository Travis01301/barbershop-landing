'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CustomerSearch } from '@/components/customer-crm/CustomerSearch'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  total_appointments: number
  last_visit_date: string
}

const ITEMS_PER_PAGE = 10

export default function BarberCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [token, setToken] = useState<string | null>(null)

  // Get token from localStorage
  useEffect(() => {
    const authToken = localStorage.getItem('authToken')
    setToken(authToken)
  }, [])

  // Fetch customers
  useEffect(() => {
    if (!token) return
    fetchCustomers()
  }, [token])

  // Filter customers based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers)
      setCurrentPage(1)
    } else {
      const term = searchTerm.toLowerCase().trim()
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (customer.phone && customer.phone.includes(term))
      )
      setFilteredCustomers(filtered)
      setCurrentPage(1)
    }
  }, [searchTerm, customers])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/customers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }

      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers || [])
        setFilteredCustomers(data.customers || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
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

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-semibold">Error loading customers</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Customer Management</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your customer profiles, history, and preferences
              </p>
            </div>
            <Link
              href="/barber/customers"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Refresh
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Search Customers
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900 placeholder-gray-500 transition-colors"
              data-testid="customer-search-input"
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

        {/* Customers Table/List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">
              No customers yet. They'll appear here when you receive bookings.
            </p>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-yellow-200 bg-yellow-50">
            <p className="text-yellow-800 font-medium">
              No customers match "{searchTerm}"
            </p>
            <p className="text-yellow-600 text-sm mt-1">Try searching with different terms</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full" data-testid="customers-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50 transition-colors"
                      data-testid={`customer-row-${customer.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 truncate">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {customer.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                          {customer.total_appointments || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(customer.last_visit_date)}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <Link
                          href={`/barber/customers/${customer.id}`}
                          className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                          data-testid={`view-button-${customer.id}`}
                        >
                          View
                        </Link>
                        <Link
                          href={`/barber/customers/${customer.id}?tab=notes`}
                          className="inline-block px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs font-medium"
                          data-testid={`notes-button-${customer.id}`}
                        >
                          Notes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {paginatedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-lg shadow-md p-4 border border-slate-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                      {customer.total_appointments || 0} visits
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">📧 {customer.email}</p>
                  {customer.phone && (
                    <p className="text-xs text-slate-600 mb-2">☎️ {customer.phone}</p>
                  )}
                  <p className="text-xs text-slate-500 mb-3">
                    Last visit: {formatDate(customer.last_visit_date)}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/barber/customers/${customer.id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-center hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/barber/customers/${customer.id}?tab=notes`}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-center hover:bg-gray-700 transition-colors text-xs font-medium"
                    >
                      Notes
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of{' '}
                  {filteredCustomers.length} customers
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                    data-testid="prev-button"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                        data-testid={`page-button-${i + 1}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                    data-testid="next-button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats */}
        {customers.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-600 uppercase">Total Customers</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{customers.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-xs font-medium text-green-600 uppercase">
                With Appointments
              </p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {customers.filter((c) => c.total_appointments > 0).length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-xs font-medium text-purple-600 uppercase">Total Appointments</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {customers.reduce((sum, c) => sum + (c.total_appointments || 0), 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
