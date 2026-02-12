'use client'
import { useState } from 'react'

interface GiftCardRedemptionProps {
  shopSlug: string
  onApply?: (amount: number, code: string) => void
  onError?: (error: string) => void
}

export default function GiftCardRedemption({ shopSlug, onApply, onError }: GiftCardRedemptionProps) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [validated, setValidated] = useState(false)
  const [giftCardData, setGiftCardData] = useState<any>(null)
  const [useAmount, setUseAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const checkGiftCard = async () => {
    if (!code.trim()) {
      setErrorMsg('Please enter a gift card code')
      return
    }

    try {
      setChecking(true)
      setErrorMsg('')

      const response = await fetch(
        `/api/gift-cards/${code.toUpperCase()}?shopSlug=${shopSlug}`
      )
      const data = await response.json()

      if (!data.valid) {
        setErrorMsg(data.reason || 'Invalid or expired gift card')
        setValidated(false)
        if (onError) onError(data.reason || 'Invalid gift card')
      } else {
        setGiftCardData(data.giftCard)
        setValidated(true)
        setUseAmount(data.giftCard.balance.toString())
      }
    } catch (error) {
      setErrorMsg('Error checking gift card')
      if (onError) onError('Error checking gift card')
    } finally {
      setChecking(false)
    }
  }

  const applyGiftCard = () => {
    const amount = parseFloat(useAmount)
    if (amount > 0 && amount <= giftCardData.balance) {
      if (onApply) onApply(amount, code)
      setCode('')
      setValidated(false)
      setGiftCardData(null)
      setUseAmount('')
    } else {
      setErrorMsg('Invalid amount')
    }
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-xl">🎁</span> Gift Card
      </h3>

      {!validated ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setErrorMsg('')
              }}
              placeholder="Enter gift card code (e.g. GC-ABC123)"
              className="flex-1 px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={checkGiftCard}
              disabled={checking || !code.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors whitespace-nowrap"
            >
              {checking ? 'Checking...' : 'Apply'}
            </button>
          </div>
          {errorMsg && (
            <p className="text-red-600 text-sm font-semibold">{errorMsg}</p>
          )}
        </div>
      ) : giftCardData && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Balance</p>
                <p className="text-2xl font-bold text-green-600">${giftCardData.balance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Original Amount</p>
                <p className="text-2xl font-bold text-gray-900">${giftCardData.originalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Amount to Use
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                max={giftCardData.balance}
                value={useAmount}
                onChange={(e) => setUseAmount(e.target.value)}
                className="w-full pl-8 px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum: ${giftCardData.balance.toFixed(2)}</p>
          </div>

          <button
            onClick={applyGiftCard}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Apply ${parseFloat(useAmount || '0').toFixed(2)} to Order
          </button>

          <button
            onClick={() => {
              setValidated(false)
              setCode('')
              setGiftCardData(null)
              setErrorMsg('')
            }}
            className="w-full px-4 py-3 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
          >
            Use Different Code
          </button>
        </div>
      )}
    </div>
  )
}
