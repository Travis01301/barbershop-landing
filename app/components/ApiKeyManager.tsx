'use client'

import { useState, useEffect } from 'react'

interface ApiKey {
  id: number
  name: string
  keyHash: string
  rateLimit: number
  isActive: boolean
  lastUsedAt: string
  expiresAt: string
  createdAt: string
}

interface ApiKeyManagerProps {
  shopId: number
}

export default function ApiKeyManager({ shopId }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ keyName: '', rateLimit: 1000 })
  const [newKey, setNewKey] = useState<any>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [shopId])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/api-keys?shopId=${shopId}`)
      const data = await response.json()

      if (response.ok) {
        setApiKeys(data.apiKeys)
      } else {
        setError(data.error || 'Failed to fetch API keys')
      }
    } catch (err) {
      setError('Failed to fetch API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create API key')
        return
      }

      setNewKey(data.apiKey)
      setFormData({ keyName: '', rateLimit: 1000 })
      setShowForm(false)
      fetchApiKeys()
    } catch (err) {
      setError('Failed to create API key')
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading API keys...</div>
  }

  return (
    <div className="space-y-6">
      {newKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-3">API Key Created Successfully</h4>
          <p className="text-sm text-blue-800 mb-3">
            Save these credentials securely. You won't be able to see them again.
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-blue-700 font-medium mb-1">API Key</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-white p-2 rounded text-xs font-mono border border-blue-200">
                  {newKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey.key, 'key')}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {copiedId === 'key' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium mb-1">Secret</p>
              <div className="flex gap-2">
                <code className="flex-1 bg-white p-2 rounded text-xs font-mono border border-blue-200">
                  {newKey.secret}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey.secret, 'secret')}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {copiedId === 'secret' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create New Key'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateKey} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={formData.keyName}
              onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
              placeholder="e.g., Mobile App"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={formData.rateLimit}
              onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create API Key
          </button>
        </form>
      )}

      {apiKeys.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No API keys created yet
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{key.name}</h4>
                  <p className="text-xs text-gray-500 font-mono">{key.keyHash}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  key.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {key.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Rate Limit: {key.rateLimit} req/hr</p>
                {key.lastUsedAt && <p>Last Used: {new Date(key.lastUsedAt).toLocaleDateString()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
