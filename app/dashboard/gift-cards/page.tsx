'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface GiftCard {
  id: number
  code: string
  amount: number
  balance: number
  recipient_name?: string
  recipient_email?: string
  is_active: boolean
  created_at: string
  last_redeemed_at?: string
}

interface Stats {
  total: number
  active: number
  redeemed: number
  expired: number
  total_issued: number
  total_redeemed: number
  total_remaining: number
}

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState('active')
  const [formData, setFormData] = useState({
    amount: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    expiresAt: ''
  })
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchGiftCards()
  }, [filter])

  const fetchGiftCards = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      setLoading(true)
      const response = await fetch(`/api/gift-cards?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setGiftCards(data.giftCards)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount) {
      alert('Please enter an amount')
      return
    }

    try {
      const token = localStorage.getItem('token')
      setCreating(true)
      const response = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          recipientName: formData.recipientName || undefined,
          recipientEmail: formData.recipientEmail || undefined,
          message: formData.message || undefined,
          expiresAt: formData.expiresAt || undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ Gift Card Created!\n\nCode: ${data.giftCard.code}\nAmount: $${data.giftCard.amount}`)
        setFormData({ amount: '', recipientName: '', recipientEmail: '', message: '', expiresAt: '' })
        setShowCreateForm(false)
        fetchGiftCards()
      } else {
        alert('Error: ' + (data.error || 'Failed to create gift card'))
      }
    } catch (error) {
      alert('Error creating gift card')
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gift Cards</h1>
            <p className="text-gray-600">Create and manage gift cards for your customers</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            + Create Gift Card
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Gift Card</h2>
            <form onSubmit={handleCreateGiftCard} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="25.00"
                      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Recipient Name</label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                    placeholder="John Doe (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Recipient Email</label>
                  <input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({...formData, recipientEmail: e.target.value})}
                    placeholder="customer@example.com (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Add a special message for the recipient..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Gift Card'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-semibold mb-1">Total Cards</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-2">${Number(stats.total_issued).toFixed(2)} issued</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-semibold mb-1">Active</p>
              <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-gray-500 mt-2">${Number(stats.total_remaining).toFixed(2)} remaining</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
              <p className="text-gray-600 text-sm font-semibold mb-1">Redeemed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.redeemed}</p>
              <p className="text-xs text-gray-500 mt-2">${Number(stats.total_redeemed).toFixed(2)} redeemed</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
              <p className="text-gray-600 text-sm font-semibold mb-1">Expired</p>
              <p className="text-3xl font-bold text-gray-900">{stats.expired}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          {['active', 'redeemed', 'expired'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-3 font-semibold transition-colors ${
                filter === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Gift Cards Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading gift cards...</p>
          </div>
        ) : giftCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No gift cards yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Create your first gift card
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Recipient</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {giftCards.map((card, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900">{card.code}</td>
                    <td className="px-6 py-4 font-semibold text-green-600">${parseFloat(card.amount.toString()).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        parseFloat(card.balance.toString()) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        ${parseFloat(card.balance.toString()).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{card.recipient_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        card.is_active && parseFloat(card.balance.toString()) > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {parseFloat(card.balance.toString()) === 0 ? 'Redeemed' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(card.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => copyToClipboard(card.code)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        Copy Code
                      </button>
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
