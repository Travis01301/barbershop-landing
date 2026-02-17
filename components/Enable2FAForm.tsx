'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Smartphone, Lock } from 'lucide-react'

interface Enable2FAFormProps {
  onMethodSelect: (method: 'sms' | 'totp') => void
  loading?: boolean
}

export const Enable2FAForm: React.FC<Enable2FAFormProps> = ({ onMethodSelect, loading = false }) => {
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'totp' | null>(null)

  const handleSelect = (method: 'sms' | 'totp') => {
    setSelectedMethod(method)
    onMethodSelect(method)
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h2>
        <p className="text-gray-600 mb-6">Choose how you want to receive your verification codes</p>

        <div className="space-y-4">
          {/* SMS Option */}
          <button
            onClick={() => handleSelect('sms')}
            disabled={loading}
            className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
              selectedMethod === 'sms'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } disabled:opacity-50`}
          >
            <div className="flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Text Message (SMS)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get a 6-digit code via SMS every time you log in
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>✓ Simple and reliable</li>
                  <li>✓ Works on any phone</li>
                </ul>
              </div>
              {selectedMethod === 'sms' && (
                <div className="text-blue-600 mt-1">✓</div>
              )}
            </div>
          </button>

          {/* Authenticator App Option */}
          <button
            onClick={() => handleSelect('totp')}
            disabled={loading}
            className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
              selectedMethod === 'totp'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } disabled:opacity-50`}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Authenticator App</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Use an app like Google Authenticator or Authy to generate codes
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>✓ More secure</li>
                  <li>✓ Works offline</li>
                  <li>✓ No SMS charges</li>
                </ul>
              </div>
              {selectedMethod === 'totp' && (
                <div className="text-blue-600 mt-1">✓</div>
              )}
            </div>
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => handleSelect(selectedMethod || 'sms')}
            disabled={!selectedMethod || loading}
            className="flex-1"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            You'll receive backup codes to recover your account if you lose access
          </p>
        </div>
      </Card>
    </div>
  )
}
