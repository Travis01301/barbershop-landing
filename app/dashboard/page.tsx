'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      router.push('/login')
      return
    }
    setToken(stored)
    fetchData(stored)
  }, [])

  const fetchData = async (token: string) => {
    try {
      const [customersRes, appointmentsRes] = await Promise.all([
        fetch('/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/appointments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (customersRes.status === 401) {
        router.push('/login')
        return
      }

      const customersData = await customersRes.json()
      const appointmentsData = await appointmentsRes.json()

      if (customersData.success) {
        setCustomers(customersData.customers.slice(0, 5))
      }
      if (appointmentsData.success) {
        setAppointments(appointmentsData.appointments || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-black">Barbershop Dashboard</h1>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-semibold">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <p className="text-3xl font-bold text-black mt-2">{appointments.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm font-medium">Total Customers</h3>
            <p className="text-3xl font-bold text-black mt-2">{customers.length}</p>
          </div>

          <Link href="/dashboard/customers" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-gray-500 text-sm font-medium">Manage Customers</h3>
            <p className="text-blue-600 font-semibold mt-2">View All →</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-black mb-4">Recent Customers</h2>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : customers.length === 0 ? (
              <p className="text-gray-500">No customers yet. Share your booking link!</p>
            ) : (
              <div className="space-y-3">
                {customers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/dashboard/customers/${customer.id}`}
                    className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-semibold text-black">{customer.name}</p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last visit: {customer.last_visit_date ? formatDate(customer.last_visit_date) : 'New customer'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/customers"
              className="block mt-4 text-blue-600 hover:underline font-semibold text-sm"
            >
              View All Customers →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-black mb-4">Quick Links</h2>
            <div className="space-y-3">
              <Link href="/dashboard/analytics" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">📊 Analytics</p>
                <p className="text-sm text-gray-600">View bookings, revenue, and performance metrics</p>
              </Link>
              <Link href="/dashboard/reports" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">📈 Reports</p>
                <p className="text-sm text-gray-600">Tax reports, payment reconciliation, customer insights</p>
              </Link>
              <Link href="/dashboard/gift-cards" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">🎁 Gift Cards</p>
                <p className="text-sm text-gray-600">Create and manage digital gift cards</p>
              </Link>
              <Link href="/dashboard/barbers" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">Manage Barbers</p>
                <p className="text-sm text-gray-600">Add, edit, or manage your barber team</p>
              </Link>
              <Link href="/dashboard/scheduling" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">📅 Scheduling</p>
                <p className="text-sm text-gray-600">Manage work schedules and time-off requests</p>
              </Link>
              <Link href="/dashboard/customers" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">Customer Profiles</p>
                <p className="text-sm text-gray-600">View and manage customer preferences</p>
              </Link>
              <a href="/dashboard" className="block p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                <p className="font-semibold text-blue-600">Appointments</p>
                <p className="text-sm text-gray-600">View and manage all appointments</p>
              </a>
            </div>
          </div>
        </div>

        {appointments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-black mb-4">Recent Appointments</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left py-2 text-black font-semibold">Customer</th>
                    <th className="text-left py-2 text-black font-semibold">Barber</th>
                    <th className="text-left py-2 text-black font-semibold">Time</th>
                    <th className="text-left py-2 text-black font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 5).map((apt) => (
                    <tr key={apt.id} className="border-b border-gray-200">
                      <td className="py-3 text-black">{apt.customer_name}</td>
                      <td className="py-3 text-black">{apt.barber_name}</td>
                      <td className="py-3 text-black">{formatDate(apt.start_time)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
