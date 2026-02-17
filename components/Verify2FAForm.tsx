'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Shield } from 'lucide-react'

interface Verify2FAFormProps {
  method: 'sms' | 'totp'
  attemptId?: string
  phoneNumber?: string
  onVerify: (code: string) => Promise<void>
  onUseBackupCode: () => void
  onResendSMS?: () => Promise<void>
  loading?: boolean
}

export const Verify2FAForm: React.FC<Verify2FAFormProps> = ({
  method,
  attemptId,
  phoneNumber,
  onVerify,
  onUseBackupCode,
  onResendSMS,
  loading = false,
}) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const expectedLength = method === 'sms' ? 6 : 6
    if (!code || code.length !== expectedLength) {
      setError(`Please enter a ${expectedLength}-digit code`)
      return
    }

    try {
      await onVerify(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code')
    }
  }

  const handleResend = async () => {
    setError('')
    if (!onResendSMS) return

    try {
      await onResendSMS()
      setResendCountdown(60)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend SMS')
    }
  }

  const getCodePlaceholder = () => {
    if (method === 'sms') return '000000'
    return '000000'
  }

  const getCodeLabel = () => {
    if (method === 'sms') return 'SMS Code'
    return 'Authenticator Code'
  }

  const getCodeDescription = () => {
    if (method === 'sms') {
      return `Enter the 6-digit code sent to ${phoneNumber || 'your phone'}`
    }
    return 'Enter the 6-digit code from your authenticator app'
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-bold">Verify Your Identity</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {getCodeLabel()}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={getCodePlaceholder()}
              maxLength={6}
              disabled={loading}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl"
            />
            <p className="text-xs text-gray-600 mt-2">{getCodeDescription()}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {method === 'sms' && (
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
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-medium"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        {/* Backup Code Option */}
        <div className="mt-4 pt-4 border-t">
          <button
            type="button"
            onClick={onUseBackupCode}
            disabled={loading}
            className="w-full text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 py-2 font-medium"
          >
            Use backup code instead
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            {method === 'sms'
              ? 'Code expires in 10 minutes'
              : 'Code changes every 30 seconds'}
          </p>
        </div>
      </Card>
    </div>
  )
}
