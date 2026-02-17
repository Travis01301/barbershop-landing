'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface BackupCodeModalProps {
  onVerify: (code: string) => Promise<void>
  onBack: () => void
  loading?: boolean
}

export const BackupCodeModal: React.FC<BackupCodeModalProps> = ({
  onVerify,
  onBack,
  loading = false,
}) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length < 8) {
      setError('Please enter a valid backup code')
      return
    }

    try {
      await onVerify(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify backup code')
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2">Use Backup Code</h2>
        <p className="text-gray-600 mb-6">
          Enter one of your backup codes to sign in
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="backupCode" className="block text-sm font-medium text-gray-700 mb-2">
              Backup Code
            </label>
            <input
              id="backupCode"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="E.g. ABC12345DEF6"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Each backup code can only be used once
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
            <Button
              type="submit"
              disabled={loading || code.length < 8}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            If you've lost all your backup codes, you can contact support for account recovery
          </p>
        </div>
      </Card>
    </div>
  )
}
