'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function GiftCardPurchasePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | string>('')
  const [customAmount, setCustomAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState({
    name: '',
    email: '',
    message: ''
  })

  const presetAmounts = [25, 50, 75, 100, 150, 200]

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(value)
  }

  const finalAmount = selectedAmount || customAmount

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4">
            🎁 Gift Cards
          </h1>
          <p className="text-xl text-slate-300">
            Give the perfect gift - a appointment at your favorite barbershop
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!showPayment ? (
            <div className="space-y-8">
              {/* Amount Selection */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Amount</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleSelectAmount(amount)}
                      className={`p-4 rounded-xl font-bold text-lg transition-all ${
                        selectedAmount === amount
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-gray-900 hover:bg-slate-200'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Or enter custom amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="5"
                      value={customAmount}
                      onChange={(e) => handleCustomAmount(e.target.value)}
                      placeholder="5.00 - 500.00"
                      className="w-full pl-8 px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Recipient Details (Optional)</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                    <input
                      type="text"
                      value={recipientInfo.name}
                      onChange={(e) => setRecipientInfo({...recipientInfo, name: e.target.value})}
                      placeholder="Recipient name"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={recipientInfo.email}
                      onChange={(e) => setRecipientInfo({...recipientInfo, email: e.target.value})}
                      placeholder="recipient@example.com"
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
                    <textarea
                      value={recipientInfo.message}
                      onChange={(e) => setRecipientInfo({...recipientInfo, message: e.target.value})}
                      placeholder="Add a personal message..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Summary & CTA */}
              <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-lg text-gray-900 font-semibold">Order Total:</p>
                  <p className="text-4xl font-black text-blue-600">
                    ${(finalAmount || '0').toString().padEnd(2, '0')}
                  </p>
                </div>

                <button
                  onClick={() => setShowPayment(true)}
                  disabled={!finalAmount || parseFloat(finalAmount.toString()) < 5}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-lg transform hover:-translate-y-1 disabled:transform-none"
                >
                  Continue to Payment
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Minimum purchase: $5.00
                </p>
              </div>

              {/* Back Link */}
              <div className="text-center">
                <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold">
                  ← Back to Booking
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to purchase?</h2>
                <p className="text-gray-600 mb-8">
                  Complete your gift card purchase for <span className="font-bold text-blue-600">${finalAmount}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl space-y-4">
                <h3 className="font-bold text-gray-900">Order Summary</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Gift Card Amount:</span>
                    <span className="font-bold text-gray-900">${finalAmount}</span>
                  </div>
                  {recipientInfo.name && (
                    <div className="flex justify-between">
                      <span>For:</span>
                      <span className="font-bold text-gray-900">{recipientInfo.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
                <p className="text-sm text-blue-900 mb-4">
                  🎉 Gift cards can be redeemed for any appointment at our barbershop!
                </p>
                <p className="text-xs text-blue-800">
                  The gift card code will be emailed immediately after purchase
                </p>
              </div>

              <div className="space-y-3">
                <button
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                >
                  💳 Pay Now - ${finalAmount}
                </button>

                <button
                  onClick={() => setShowPayment(false)}
                  className="w-full py-4 bg-gray-300 text-gray-900 rounded-xl font-bold hover:bg-gray-400 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          <div className="text-center text-white">
            <p className="text-3xl mb-2">✨</p>
            <p className="font-bold mb-2">Perfect Gift</p>
            <p className="text-sm text-slate-300">For barber enthusiasts</p>
          </div>
          <div className="text-center text-white">
            <p className="text-3xl mb-2">📧</p>
            <p className="font-bold mb-2">Instant Delivery</p>
            <p className="text-sm text-slate-300">Email code immediately</p>
          </div>
          <div className="text-center text-white">
            <p className="text-3xl mb-2">♾️</p>
            <p className="font-bold mb-2">No Expiration</p>
            <p className="text-sm text-slate-300">Never expires</p>
          </div>
        </div>
      </div>
    </div>
  )
}
