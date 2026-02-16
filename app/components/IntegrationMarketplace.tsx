'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface App {
  id: number
  name: string
  description: string
  iconUrl?: string
  developerName: string
  rating: number
  isInstalled: boolean
  isActive?: boolean
}

interface IntegrationMarketplaceProps {
  shopId: number
}

export default function IntegrationMarketplace({ shopId }: IntegrationMarketplaceProps) {
  const [apps, setApps] = useState<App[]>([])
  const [installedApps, setInstalledApps] = useState<App[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'installed'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    fetchApps()
  }, [shopId, activeTab])

  const fetchApps = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        shopId: shopId.toString(),
        onlyInstalled: (activeTab === 'installed').toString(),
      })

      const response = await fetch(`/api/integrations/marketplace?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (activeTab === 'installed') {
          setInstalledApps(data.apps)
        } else {
          setApps(data.apps)
        }
      } else {
        setError(data.error || 'Failed to fetch apps')
      }
    } catch (err) {
      setError('Failed to fetch apps')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstall = async (appId: number) => {
    setActionLoading(appId)
    setError('')

    try {
      const response = await fetch('/api/integrations/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          appId,
          action: 'install',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to install app')
        return
      }

      fetchApps()
    } catch (err) {
      setError('Failed to install app')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUninstall = async (appId: number) => {
    if (!confirm('Are you sure you want to uninstall this app?')) {
      return
    }

    setActionLoading(appId)
    setError('')

    try {
      const response = await fetch('/api/integrations/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          appId,
          action: 'uninstall',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to uninstall app')
        return
      }

      fetchApps()
    } catch (err) {
      setError('Failed to uninstall app')
    } finally {
      setActionLoading(null)
    }
  }

  const displayApps = activeTab === 'installed' ? installedApps : apps

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">App Marketplace</h2>

        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Available Apps
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'installed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Installed Apps
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading apps...</div>
      ) : displayApps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {activeTab === 'installed'
            ? 'No apps installed yet. Browse available apps to get started!'
            : 'No apps available'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayApps.map((app) => (
            <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                {app.iconUrl && (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                    <Image
                      src={app.iconUrl}
                      alt={app.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                  <p className="text-xs text-gray-600">{app.developerName}</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{app.description}</p>

              {app.rating > 0 && (
                <div className="text-xs text-gray-600 mb-3">
                  {'★'.repeat(Math.round(app.rating))} {app.rating.toFixed(1)}
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-gray-200">
                {activeTab === 'installed' ? (
                  <button
                    onClick={() => handleUninstall(app.id)}
                    disabled={actionLoading === app.id}
                    className="w-full px-3 py-2 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:bg-gray-100"
                  >
                    {actionLoading === app.id ? 'Uninstalling...' : 'Uninstall'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(app.id)}
                    disabled={actionLoading === app.id || app.isInstalled}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {actionLoading === app.id ? 'Installing...' : app.isInstalled ? 'Installed' : 'Install'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
