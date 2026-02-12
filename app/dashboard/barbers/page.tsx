'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Barber {
  id: number
  name: string
  email: string
  is_active: boolean
}

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const router = useRouter()

  useEffect(() => {
    fetchBarbers()
  }, [])

  const fetchBarbers = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/barbers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setBarbers(data.barbers)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBarber = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/barbers', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setShowAddForm(false)
        setFormData({ name: '', email: '', password: '' })
        fetchBarbers()
      } else {
        alert(data.error || 'Failed to add barber')
      }
    } catch (error) {
      alert('Error adding barber')
    }
  }

  const handleToggleActive = async (barberId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/barbers/${barberId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      const data = await response.json()
      if (data.success) {
        fetchBarbers()
      }
    } catch (error) {
      alert('Error updating barber')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Barbers</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Add Barber Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : '+ Add New Barber'}
          </button>
        </div>

        {/* Add Barber Form */}
        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Add New Barber</h3>
            <form onSubmit={handleAddBarber} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
              >
                Add Barber
              </button>
            </form>
          </div>
        )}

        {/* Barbers List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Your Barbers ({barbers.length})</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : barbers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No barbers yet. Add your first one!</div>
          ) : (
            <div className="divide-y">
              {barbers.map((barber) => (
                <div key={barber.id} className="p-6 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{barber.name}</h3>
                    <p className="text-sm text-gray-600">{barber.email}</p>
                    <span className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      barber.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {barber.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleToggleActive(barber.id, barber.is_active)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        barber.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {barber.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
