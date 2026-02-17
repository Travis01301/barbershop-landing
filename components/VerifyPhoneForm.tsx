'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Phone } from 'lucide-react'

interface VerifyPhoneFormProps {
  onPhoneSubmit: (phone: string) => Promise<void>
  onCodeVerify: (code: string, attemptId: string) => Promise<void>
  onBack: () => void
  loading?: boolean
}

export const VerifyPhoneForm: React.FC<VerifyPhoneFormProps> = ({
  onPhoneSubmit,
  onCodeVerify,
  onBack,
  loading = false,
}) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [attemptId, setAttemptId] = useState('')
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate phone number
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    try {
      await onPhoneSubmit(phone)
      setStep('code')
      setCodeSent(true)
      setResendCountdown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS code')
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
      await onCodeVerify(code, attemptId)
      setStep('phone') // Reset for next use
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    }
  }

  const handleResend = async () => {
    setError('')
    try {
      await onPhoneSubmit(phone)
      setCodeSent(true)
      setResendCountdown(60)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend SMS code')
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Phone className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-bold">Verify Phone Number</h2>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send a verification code to this number
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
                onClick={onBack}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || !phone} className="flex-1">
                {loading ? 'Sending...' : 'Send Code'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCodeVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl letter-spacing"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="text-center">
              {resendCountdown > 0 ? (
                <p className="text-sm text-gray-600">
                  Resend code in {resendCountdown}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            {step === 'phone'
              ? 'Make sure you have access to this phone number'
              : 'Code expires in 10 minutes. Check your messages.'}
          </p>
        </div>
      </Card>
    </div>
  )
}
