'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CustomerProfile } from '@/components/customer-crm/CustomerProfile'
import { CustomerHistory } from '@/components/customer-crm/CustomerHistory'
import { CustomerNotes } from '@/components/customer-crm/CustomerNotes'
import { CustomerPreferences } from '@/components/customer-crm/CustomerPreferences'

interface RouteParams {
  id: string
}

export default function CustomerDetailPage({ params }: { params: RouteParams }) {
  const { id } = params
  const searchParams = useSearchParams()
  const customerId = parseInt(id)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'profile' | 'history' | 'notes' | 'preferences'
  >('profile')

  // Get tab from URL if available
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'history' || tab === 'notes' || tab === 'preferences') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Get token from localStorage
  useEffect(() => {
    const authToken = localStorage.getItem('authToken')
    setToken(authToken)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-semibold">Authentication Error</p>
          <p className="text-red-600 text-sm mt-2">Please log in to view this page.</p>
          <Link
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!customerId || isNaN(customerId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-semibold">Invalid Customer ID</p>
          <Link
            href="/barber/customers"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    )
  }

  const tabs: Array<{
    id: 'profile' | 'history' | 'notes' | 'preferences'
    label: string
    icon: string
  }> = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'history', label: 'Appointment History', icon: '📅' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'notes', label: 'Internal Notes', icon: '📝' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link
                href="/barber/customers"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
              >
                <span>←</span>
                Back to Customers
              </Link>
              <h1 className="text-3xl font-bold text-slate-900">Customer Details</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Content */}
        <div data-testid={`tab-content-${activeTab}`}>
          {activeTab === 'profile' && (
            <CustomerProfile customerId={customerId} token={token} />
          )}
          {activeTab === 'history' && (
            <CustomerHistory customerId={customerId} token={token} />
          )}
          {activeTab === 'preferences' && (
            <CustomerPreferences customerId={customerId} token={token} />
          )}
          {activeTab === 'notes' && (
            <CustomerNotes customerId={customerId} token={token} />
          )}
        </div>
      </div>
    </div>
  )
}
