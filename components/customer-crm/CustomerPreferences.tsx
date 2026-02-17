'use client'

import { useState, useEffect } from 'react'

interface CustomerPreferencesProps {
  customerId: number
  token: string
}

interface Barber {
  id: number
  name: string
}

interface PreferencesData {
  styling_notes: string
  allergies: string
  health_notes: string
  preferred_barber_id: number | null
  preferred_contact_method: string
  do_not_disturb_time: string
}

export function CustomerPreferences({ customerId, token }: CustomerPreferencesProps) {
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [barbers, setBarbers] = useState<Barber[]>([])

  const [preferences, setPreferences] = useState<PreferencesData>({
    styling_notes: '',
    allergies: '',
    health_notes: '',
    preferred_barber_id: null,
    preferred_contact_method: 'email',
    do_not_disturb_time: '',
  })

  const [originalPreferences, setOriginalPreferences] = useState<PreferencesData>({ ...preferences })

  useEffect(() => {
    fetchCustomerPreferences()
    fetchBarbers()
  }, [customerId, token])

  const fetchCustomerPreferences = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch customer preferences')
      }

      const data = await response.json()
      if (data.success) {
        const customer = data.customer
        const prefs: PreferencesData = {
          styling_notes: customer.styling_notes || '',
          allergies: customer.allergies || '',
          health_notes: customer.health_notes || '',
          preferred_barber_id: customer.preferred_barber_id || null,
          preferred_contact_method: customer.preferred_contact_method || 'email',
          do_not_disturb_time: customer.do_not_disturb_time || '',
        }
        setPreferences(prefs)
        setOriginalPreferences(prefs)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/barbers', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.barbers) {
          setBarbers(data.barbers)
        }
      }
    } catch (err) {
      // Silently fail for barbers fetch
      console.error('Failed to fetch barbers:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          styling_notes: preferences.styling_notes || null,
          allergies: preferences.allergies || null,
          health_notes: preferences.health_notes || null,
          preferred_barber_id: preferences.preferred_barber_id,
          preferred_contact_method: preferences.preferred_contact_method,
          do_not_disturb_time: preferences.do_not_disturb_time || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      const data = await response.json()
      if (data.success) {
        setOriginalPreferences({ ...preferences })
        setEditMode(false)
        setSuccessMessage('Preferences saved successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPreferences({ ...originalPreferences })
    setEditMode(false)
    setError(null)
  }

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences)

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customer Preferences</h2>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Edit Preferences
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {editMode ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Service Preferences */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Service Preferences
            </label>
            <textarea
              value={preferences.styling_notes}
              onChange={(e) =>
                setPreferences({ ...preferences, styling_notes: e.target.value })
              }
              placeholder="e.g., Prefers fades, likes tight lines, dislikes razors..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
              data-testid="styling-notes-textarea"
            />
            <p className="text-xs text-gray-500 mt-1">Preferred services and hairstyle notes</p>
          </div>

          {/* Hairstyle Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Hairstyle Notes
            </label>
            <textarea
              value={preferences.health_notes}
              onChange={(e) =>
                setPreferences({ ...preferences, health_notes: e.target.value })
              }
              placeholder="e.g., Cowlick on back, hair naturally curls to left..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
              data-testid="hairstyle-notes-textarea"
            />
            <p className="text-xs text-gray-500 mt-1">Physical hair characteristics to remember</p>
          </div>

          {/* Allergies & Sensitivities */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              ⚠️ Allergies & Sensitivities
            </label>
            <textarea
              value={preferences.allergies}
              onChange={(e) =>
                setPreferences({ ...preferences, allergies: e.target.value })
              }
              placeholder="e.g., Allergic to lavender, sensitive to alcohol-based products..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
              data-testid="allergies-textarea"
            />
            <p className="text-xs text-red-600 mt-1">⚠️ CRITICAL: Document all allergies and sensitivities</p>
          </div>

          {/* Barber Preference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Preferred Barber
            </label>
            <select
              value={preferences.preferred_barber_id || ''}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  preferred_barber_id: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              data-testid="preferred-barber-select"
            >
              <option value="">No preference</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Who should this customer request when booking?</p>
          </div>

          {/* Contact Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Preferred Contact Method
              </label>
              <select
                value={preferences.preferred_contact_method}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    preferred_contact_method: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                data-testid="contact-method-select"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Do Not Disturb Times
              </label>
              <input
                type="text"
                value={preferences.do_not_disturb_time}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    do_not_disturb_time: e.target.value,
                  })
                }
                placeholder="e.g., 9am-11am, after 6pm"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
                data-testid="dnd-input"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
              data-testid="save-button"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              data-testid="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // Display Mode
        <div className="space-y-6">
          {/* Service Preferences */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Service Preferences</h3>
            <p className="text-sm text-blue-800" data-testid="styling-notes-display">
              {preferences.styling_notes || (
                <span className="italic text-blue-600">Not specified</span>
              )}
            </p>
          </div>

          {/* Hairstyle Notes */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Hairstyle Notes</h3>
            <p className="text-sm text-green-800" data-testid="hairstyle-notes-display">
              {preferences.health_notes || (
                <span className="italic text-green-600">Not specified</span>
              )}
            </p>
          </div>

          {/* Allergies */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200">
            <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              ⚠️ Allergies & Sensitivities
            </h3>
            <p className="text-sm text-red-800" data-testid="allergies-display">
              {preferences.allergies || (
                <span className="italic text-red-600">No allergies documented</span>
              )}
            </p>
          </div>

          {/* Barber & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">Preferred Barber</h3>
              <p className="text-sm text-purple-800" data-testid="preferred-barber-display">
                {preferences.preferred_barber_id
                  ? barbers.find((b) => b.id === preferences.preferred_barber_id)?.name ||
                    'Unknown'
                  : <span className="italic text-purple-600">No preference</span>}
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">Contact Method</h3>
              <p className="text-sm text-yellow-800 capitalize" data-testid="contact-method-display">
                {preferences.preferred_contact_method}
              </p>
            </div>
          </div>

          {/* DND Times */}
          {preferences.do_not_disturb_time && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-orange-900 mb-2">Do Not Disturb Times</h3>
              <p className="text-sm text-orange-800">{preferences.do_not_disturb_time}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
