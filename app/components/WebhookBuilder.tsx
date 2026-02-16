'use client'

import { useState, useEffect } from 'react'

interface Webhook {
  id: number
  url: string
  events: string[]
  isActive: boolean
  retryEnabled: boolean
  createdAt: string
}

interface WebhookBuilderProps {
  shopId: number
}

const AVAILABLE_EVENTS = [
  'appointment_created',
  'appointment_completed',
  'appointment_cancelled',
  'payment_completed',
  'payment_failed',
  'customer_registered',
  'review_submitted',
  'customer_updated',
]

export default function WebhookBuilder({ shopId }: WebhookBuilderProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    webhookUrl: '',
    events: [] as string[],
    maxRetries: 5,
    retryBackoffSeconds: 30,
  })
  const [testResult, setTestResult] = useState<any>(null)
  const [testingId, setTestingId] = useState<number | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [shopId])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch(`/api/webhooks/management?shopId=${shopId}`)
      const data = await response.json()

      if (response.ok) {
        setWebhooks(data.webhooks)
      } else {
        setError(data.error || 'Failed to fetch webhooks')
      }
    } catch (err) {
      setError('Failed to fetch webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.events.length === 0) {
      setError('Please select at least one event')
      return
    }

    try {
      const response = await fetch('/api/webhooks/management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create webhook')
        return
      }

      setFormData({ webhookUrl: '', events: [], maxRetries: 5, retryBackoffSeconds: 30 })
      setShowForm(false)
      fetchWebhooks()
    } catch (err) {
      setError('Failed to create webhook')
    }
  }

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const testWebhook = async (webhookId: number) => {
    setTestingId(webhookId)
    setTestResult(null)

    try {
      // In production, this would send a test payload to the webhook
      const response = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      })

      const data = await response.json()
      setTestResult(data)
    } catch (err) {
      setTestResult({ success: false, error: 'Failed to test webhook' })
    } finally {
      setTestingId(null)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading webhooks...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Webhooks</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : 'Create Webhook'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateWebhook} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              placeholder="https://example.com/webhooks"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Subscribe to Events
            </label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={formData.maxRetries}
                onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retry Backoff (seconds)
              </label>
              <input
                type="number"
                value={formData.retryBackoffSeconds}
                onChange={(e) => setFormData({ ...formData, retryBackoffSeconds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Webhook
          </button>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No webhooks configured yet
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 break-all">{webhook.url}</h4>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {webhook.events.map((event) => (
                      <span key={event} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  webhook.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {webhook.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-xs text-gray-600 mb-3">
                <p>Created: {new Date(webhook.createdAt).toLocaleDateString()}</p>
                <p>Retry: {webhook.retryEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <button
                onClick={() => testWebhook(webhook.id)}
                disabled={testingId === webhook.id}
                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:bg-gray-100"
              >
                {testingId === webhook.id ? 'Testing...' : 'Test Delivery'}
              </button>
            </div>
          ))}
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-lg border ${
          testResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={testResult.success ? 'text-green-800' : 'text-red-800'}>
            {testResult.message || testResult.error}
          </p>
        </div>
      )}
    </div>
  )
}
