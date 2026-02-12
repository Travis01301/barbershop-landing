'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      router.push('/login')
      return
    }
    setToken(stored)
    fetchCustomers(stored)
  }, [])

  const fetchCustomers = async (token: string) => {
    try {
      const response = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading customers...</div>
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black">Customers</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {customers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No customers yet. They'll be created when you receive bookings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-3 text-left text-black">Name</th>
                  <th className="border border-gray-300 p-3 text-left text-black">Email</th>
                  <th className="border border-gray-300 p-3 text-left text-black">Phone</th>
                  <th className="border border-gray-300 p-3 text-left text-black">Appointments</th>
                  <th className="border border-gray-300 p-3 text-left text-black">Last Visit</th>
                  <th className="border border-gray-300 p-3 text-left text-black">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 text-black">{customer.name}</td>
                    <td className="border border-gray-300 p-3 text-black">{customer.email}</td>
                    <td className="border border-gray-300 p-3 text-black">{customer.phone || '-'}</td>
                    <td className="border border-gray-300 p-3 text-black">{customer.total_appointments || 0}</td>
                    <td className="border border-gray-300 p-3 text-black">{formatDate(customer.last_visit_date)}</td>
                    <td className="border border-gray-300 p-3">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
