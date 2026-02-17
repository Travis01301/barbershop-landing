'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Smartphone, Lock, Download, RotateCw, Trash2, ChevronDown } from 'lucide-react'

interface TwoFAStatus {
  is_enabled: boolean
  method: 'sms' | 'totp' | 'none'
  phone_number?: string
  totp_configured?: boolean
}

interface Use2FASettingsProps {
  onEnable: () => void
  onDisable: () => void
  onRegenerateCodes: () => void
  loading?: boolean
}

export const Use2FASettings: React.FC<Use2FASettingsProps> = ({
  onEnable,
  onDisable,
  onRegenerateCodes,
  loading = false,
}) => {
  const [status, setStatus] = useState<TwoFAStatus | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setFetchLoading(true)
      const response = await fetch('/api/2fa/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch 2FA status')

      const data = await response.json()
      setStatus({
        is_enabled: data.is_enabled,
        method: data.method,
        phone_number: data.phone_number,
        totp_configured: data.totp_configured,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch 2FA status')
    } finally {
      setFetchLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">Loading 2FA settings...</div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
          <p className="text-gray-600">
            {status?.is_enabled ? 'Your account is protected with 2FA' : 'Enable 2FA to secure your account'}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
          status?.is_enabled
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status?.is_enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-lg flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!status?.is_enabled ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Two-factor authentication adds an extra layer of security to your account by requiring a code in addition to your password.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">SMS Authentication</h3>
                  <p className="text-sm text-gray-600 mt-1">Get codes via text message</p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Authenticator App</h3>
                  <p className="text-sm text-gray-600 mt-1">Use an app like Google Authenticator</p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={onEnable}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Method */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3 mb-3">
              {status.method === 'sms' ? (
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-green-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">
                  {status.method === 'sms' ? 'SMS Authentication' : 'Authenticator App'}
                </h3>
                {status.method === 'sms' && status.phone_number && (
                  <p className="text-sm text-gray-600 mt-1">
                    Verification code sent to {status.phone_number}
                  </p>
                )}
                {status.method === 'totp' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Using authenticator app
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 font-medium text-left"
            >
              <span>More options</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {expanded && (
              <div className="space-y-2 pl-3">
                <Button
                  onClick={onRegenerateCodes}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Generate New Backup Codes
                </Button>

                <Button
                  onClick={onDisable}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-yellow-50 rounded-lg flex gap-2 border border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Keep your authenticator app or phone secure. If you lose access to either, you can use your backup codes to sign in.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
