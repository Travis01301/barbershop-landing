'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Copy, Check } from 'lucide-react'

interface SetupAuthenticatorFormProps {
  secret?: string
  qrCodeUrl?: string
  onCodeVerify: (code: string) => Promise<void>
  onBack: () => void
  loading?: boolean
}

export const SetupAuthenticatorForm: React.FC<SetupAuthenticatorFormProps> = ({
  secret,
  qrCodeUrl,
  onCodeVerify,
  onBack,
  loading = false,
}) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    try {
      await onCodeVerify(code)
      setStep('setup') // Reset
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Set Up Authenticator App</h2>
        <p className="text-gray-600 mb-6">
          Use an app like Google Authenticator, Authy, or Microsoft Authenticator
        </p>

        {step === 'setup' ? (
          <div className="space-y-6">
            {/* Step 1: Scan QR Code */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-3">
                Open your authenticator app and scan this QR code:
              </p>

              {qrCodeUrl && (
                <div className="bg-gray-100 p-4 rounded-lg flex justify-center mb-3">
                  {/* In production, generate actual QR code image */}
                  <div className="text-center text-sm text-gray-600">
                    <p>QR Code would appear here</p>
                    <p className="text-xs mt-1">otpauth://totp/...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Manual Entry */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Step 2: Can't Scan?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter this key manually in your authenticator app:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secret || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopySecret}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Store this key somewhere safe in case you need to set up again
              </p>
            </div>

            {/* Step 3: Verify */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Step 3: Verify Setup</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter a code from your authenticator app to confirm it's working:
              </p>
              <button
                onClick={() => setStep('verify')}
                disabled={loading}
                className="w-full py-2 px-3 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Setting up...' : 'Enter Verification Code'}
              </button>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCodeVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                6-Digit Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                This code changes every 30 seconds
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('setup')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Keep your authenticator app secure. Don't share the key with anyone.
          </p>
        </div>
      </Card>
    </div>
  )
}
