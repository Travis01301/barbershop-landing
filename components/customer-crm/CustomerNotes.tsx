'use client'

import { useState, useEffect } from 'react'

interface CustomerNotesProps {
  customerId: number
  token: string
}

export function CustomerNotes({ customerId, token }: CustomerNotesProps) {
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [notes, setNotes] = useState({
    styling_notes: '',
    allergies: '',
    health_notes: '',
    do_not_disturb_time: '',
    preferred_barber_id: '',
    preferred_contact_method: 'email',
  })

  const [originalNotes, setOriginalNotes] = useState({ ...notes })

  useEffect(() => {
    fetchCustomerNotes()
  }, [customerId, token])

  const fetchCustomerNotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch customer notes')
      }

      const data = await response.json()
      if (data.success) {
        const customer = data.customer
        const customerNotes = {
          styling_notes: customer.styling_notes || '',
          allergies: customer.allergies || '',
          health_notes: customer.health_notes || '',
          do_not_disturb_time: customer.do_not_disturb_time || '',
          preferred_barber_id: customer.preferred_barber_id?.toString() || '',
          preferred_contact_method: customer.preferred_contact_method || 'email',
        }
        setNotes(customerNotes)
        setOriginalNotes(customerNotes)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
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
          styling_notes: notes.styling_notes || null,
          allergies: notes.allergies || null,
          health_notes: notes.health_notes || null,
          do_not_disturb_time: notes.do_not_disturb_time || null,
          preferred_barber_id: notes.preferred_barber_id ? parseInt(notes.preferred_barber_id) : null,
          preferred_contact_method: notes.preferred_contact_method,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save notes')
      }

      const data = await response.json()
      if (data.success) {
        setOriginalNotes({ ...notes })
        setEditMode(false)
        setSuccessMessage('Notes saved successfully!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setNotes({ ...originalNotes })
    setEditMode(false)
    setError(null)
  }

  const hasChanges =
    JSON.stringify(notes) !== JSON.stringify(originalNotes)

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Customer Notes</h2>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Edit Notes
          </button>
        ) : null}
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
          {/* Styling Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Styling Preferences
            </label>
            <textarea
              value={notes.styling_notes}
              onChange={(e) =>
                setNotes({ ...notes, styling_notes: e.target.value })
              }
              placeholder="e.g., Prefers fades on sides, 2-3 on length, tapered back..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Internal notes about preferred cuts and styles</p>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Allergies & Sensitivities
            </label>
            <textarea
              value={notes.allergies}
              onChange={(e) =>
                setNotes({ ...notes, allergies: e.target.value })
              }
              placeholder="e.g., Allergic to lavender, sensitive to alcohol-based products..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">⚠️ Important for safety - disclose all known allergies</p>
          </div>

          {/* Health Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Health Considerations
            </label>
            <textarea
              value={notes.health_notes}
              onChange={(e) =>
                setNotes({ ...notes, health_notes: e.target.value })
              }
              placeholder="e.g., Scalp sensitivity, eczema, recent surgery, medication side effects..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Medical considerations to be aware of</p>
          </div>

          {/* Contact Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Preferred Contact Method
              </label>
              <select
                value={notes.preferred_contact_method}
                onChange={(e) =>
                  setNotes({
                    ...notes,
                    preferred_contact_method: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                value={notes.do_not_disturb_time}
                onChange={(e) =>
                  setNotes({
                    ...notes,
                    do_not_disturb_time: e.target.value,
                  })
                }
                placeholder="e.g., 9am-11am, after 6pm"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-slate-100 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // Display Mode
        <div className="space-y-6">
          {/* Styling Notes */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Styling Preferences
            </h3>
            <p className="text-sm text-blue-800">
              {notes.styling_notes || (
                <span className="italic text-blue-600">No styling notes added</span>
              )}
            </p>
          </div>

          {/* Allergies */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200">
            <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              ⚠️ Allergies & Sensitivities
            </h3>
            <p className="text-sm text-red-800">
              {notes.allergies || (
                <span className="italic text-red-600">No allergies documented</span>
              )}
            </p>
          </div>

          {/* Health Notes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">
              Health Considerations
            </h3>
            <p className="text-sm text-yellow-800">
              {notes.health_notes || (
                <span className="italic text-yellow-600">No health notes on file</span>
              )}
            </p>
          </div>

          {/* Contact & DND */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200">
              <h3 className="text-sm font-semibold text-green-900 mb-2">
                Preferred Contact
              </h3>
              <p className="text-sm text-green-800 capitalize">
                {notes.preferred_contact_method || 'Not specified'}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">
                Do Not Disturb
              </h3>
              <p className="text-sm text-purple-800">
                {notes.do_not_disturb_time || (
                  <span className="italic text-purple-600">Always available</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
