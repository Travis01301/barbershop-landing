'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Download, Copy, Check } from 'lucide-react'

interface BackupCodesModalProps {
  codes: string[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export const BackupCodesModal: React.FC<BackupCodesModalProps> = ({
  codes,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyAll = () => {
    const codeText = codes.join('\n')
    navigator.clipboard.writeText(codeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([codes.join('\n')], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'barbershop-backup-codes.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-2">Save Your Backup Codes</h2>
        <p className="text-gray-600 mb-6">
          Store these codes in a safe place. You can use them to access your account if you lose access to your 2FA device.
        </p>

        {/* Warning */}
        <div className="p-4 bg-amber-50 rounded-lg flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-900 font-semibold">Keep these codes private and secure</p>
            <p className="text-amber-800 text-xs mt-1">
              Each code can only be used once. If you share these codes, your account security is at risk.
            </p>
          </div>
        </div>

        {/* Backup Codes Display */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto font-mono text-sm">
          <div className="grid grid-cols-2 gap-3">
            {codes.map((code, index) => (
              <div
                key={index}
                className="bg-white p-2 rounded border border-gray-300 text-center"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            Download Codes
          </Button>
          <Button
            onClick={handleCopyAll}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-3 mb-6 flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            We recommend printing or storing these codes in a password manager
          </p>
        </div>

        {/* Confirmation Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Confirming...' : 'I have saved my codes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
