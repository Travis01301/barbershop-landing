'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function CustomerProfilePage() {
  const params = useParams()
  const customerId = params.id as string
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [barbers, setBarbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    styling_notes: '',
    allergies: '',
    health_notes: '',
    preferred_barber_id: '',
    preferred_contact_method: 'email',
    do_not_disturb_time: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      router.push('/login')
      return
    }
    setToken(stored)
    fetchCustomer(stored)
    fetchBarbers(stored)
  }, [])

  const fetchCustomer = async (token: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setCustomer(data.customer)
        setFormData({
          name: data.customer.name,
          phone: data.customer.phone || '',
          address: data.customer.address || '',
          styling_notes: data.customer.styling_notes || '',
          allergies: data.customer.allergies || '',
          health_notes: data.customer.health_notes || '',
          preferred_barber_id: data.customer.preferred_barber_id?.toString() || '',
          preferred_contact_method: data.customer.preferred_contact_method || 'email',
          do_not_disturb_time: data.customer.do_not_disturb_time || '',
        })
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBarbers = async (token: string) => {
    try {
      const response = await fetch('/api/barbers', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setBarbers(data.barbers)
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          preferred_barber_id: formData.preferred_barber_id ? parseInt(formData.preferred_barber_id) : null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Profile updated successfully!')
        setCustomer(data.customer)
      } else {
        alert('Failed to update profile: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error saving profile')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading customer...</div>
  }

  if (!customer) {
    return <div className="p-8 text-center text-red-600">Customer not found</div>
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">{customer.name}</h1>
          <Link href="/dashboard/customers" className="text-blue-600 hover:underline">
            Back to Customers
          </Link>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-black mb-6">Edit Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border-2 rounded-lg text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Email</label>
              <input
                type="email"
                value={customer.email}
                disabled
                className="w-full p-3 border-2 rounded-lg text-gray-500 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border-2 rounded-lg text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 border-2 rounded-lg text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Preferred Barber</label>
              <select
                value={formData.preferred_barber_id}
                onChange={(e) => setFormData({ ...formData, preferred_barber_id: e.target.value })}
                className="w-full p-3 border-2 rounded-lg text-black"
              >
                <option value="">None</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Contact Method</label>
              <select
                value={formData.preferred_contact_method}
                onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                className="w-full p-3 border-2 rounded-lg text-black"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Styling Notes</label>
              <textarea
                value={formData.styling_notes}
                onChange={(e) => setFormData({ ...formData, styling_notes: e.target.value })}
                placeholder="e.g., Prefers fades on sides, 2-3 on length"
                className="w-full p-3 border-2 rounded-lg text-black"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Allergies</label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g., Sensitive to lavender products"
                className="w-full p-3 border-2 rounded-lg text-black"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Health Notes</label>
              <textarea
                value={formData.health_notes}
                onChange={(e) => setFormData({ ...formData, health_notes: e.target.value })}
                placeholder="e.g., Scalp sensitivity, use mild shampoo"
                className="w-full p-3 border-2 rounded-lg text-black"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-black">Do Not Disturb Time</label>
              <input
                type="text"
                value={formData.do_not_disturb_time}
                onChange={(e) => setFormData({ ...formData, do_not_disturb_time: e.target.value })}
                placeholder="e.g., 9-11am, after 6pm"
                className="w-full p-3 border-2 rounded-lg text-black"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {customer.appointment_history && customer.appointment_history.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-xl font-bold text-black mb-6">Appointment History</h2>
            <div className="space-y-4">
              {customer.appointment_history.map((apt: any) => (
                <div key={apt.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold text-black">{apt.barber_name} - {formatDate(apt.date)}</p>
                  <p className="text-sm text-gray-600">Status: {apt.status}</p>
                  {apt.notes && <p className="text-sm text-gray-600 mt-1">Notes: {apt.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
