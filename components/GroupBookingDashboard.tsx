'use client'

import { useState, useEffect } from 'react'

interface Member {
  id: string
  customerId?: string
  barberId?: string
  guestName?: string
  guestEmail?: string
  slotTime: string
  servicePrice: number
  status: string
}

interface GroupBooking {
  id: string
  groupName: string
  groupSize: number
  totalCost: number
  subtotalCost: number
  discountPercent: number
  discountAmount: number
  status: string
  createdAt: string
  memberCount?: number
  members?: Member[]
}

interface GroupBookingDashboardProps {
  groupId: string
  isOrganizerView?: boolean
}

export function GroupBookingDashboard({ groupId, isOrganizerView = false }: GroupBookingDashboardProps) {
  const [group, setGroup] = useState<GroupBooking | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  useEffect(() => {
    fetchGroupDetails()
  }, [groupId])

  const fetchGroupDetails = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch group')

      const data = await response.json()
      setGroup(data.booking)
      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading group')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmGroup = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/groups/${groupId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to confirm group')
      await fetchGroupDetails()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error confirming group')
    }
  }

  const handleCancelGroup = async () => {
    if (!window.confirm('Are you sure you want to cancel this group booking?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/groups/${groupId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Organizer cancelled' }),
      })

      if (!response.ok) throw new Error('Failed to cancel group')
      await fetchGroupDetails()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelling group')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member from the group?')) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to remove member')
      await fetchGroupDetails()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error removing member')
    }
  }

  const handlePayment = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/groups/${groupId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: group?.totalCost || 0,
          email: localStorage.getItem('user_email') || '',
        }),
      })

      if (!response.ok) throw new Error('Failed to create payment')

      const data = await response.json()
      // Here you would integrate with Stripe to complete the payment
      console.log('Payment intent created:', data.paymentIntentId)
      setShowPaymentDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing payment')
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading group details...</div>
  }

  if (!group) {
    return <div className="p-6 text-center text-red-600">Group not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{group.groupName}</h1>
            <p className="text-gray-600">Group Status: <span className="font-semibold">{group.status}</span></p>
          </div>
          {isOrganizerView && (
            <div className="space-x-2">
              {group.status === 'pending' && (
                <button
                  onClick={handleConfirmGroup}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Confirm Group
                </button>
              )}
              {group.status !== 'cancelled' && group.status !== 'completed' && (
                <button
                  onClick={handleCancelGroup}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Cancel Group
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Pricing Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Pricing Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal ({members.length} members):</span>
            <span>${group.subtotalCost.toFixed(2)}</span>
          </div>
          {group.discountPercent > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Discount ({group.discountPercent}%):</span>
                <span>-${group.discountAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2"></div>
            </>
          )}
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>${group.totalCost.toFixed(2)}</span>
          </div>
        </div>

        {isOrganizerView && group.status !== 'cancelled' && group.status !== 'completed' && (
          <button
            onClick={() => setShowPaymentDialog(true)}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Pay Now
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Group Members ({members.length}/{group.groupSize})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Slot Time</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Status</th>
                {isOrganizerView && <th className="px-4 py-2 text-left">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2">{member.guestName || 'Customer'}</td>
                  <td className="px-4 py-2">{member.servicePrice}</td>
                  <td className="px-4 py-2">{new Date(member.slotTime).toLocaleString()}</td>
                  <td className="px-4 py-2">${member.servicePrice.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      member.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      member.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  {isOrganizerView && (
                    <td className="px-4 py-2">
                      {member.status !== 'completed' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Complete Payment</h3>
            <p className="mb-4">
              Total amount due: <span className="font-bold text-lg">${group.totalCost.toFixed(2)}</span>
            </p>
            <div className="space-x-2">
              <button
                onClick={handlePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Proceed to Payment
              </button>
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
