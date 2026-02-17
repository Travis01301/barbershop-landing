'use client';

import React, { useState } from 'react';
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react';

interface RestoreModalProps {
  isOpen: boolean;
  backup: any;
  onClose: () => void;
  onConfirm: (password: string, testRestore: boolean) => Promise<void>;
}

export default function RestoreModal({
  isOpen,
  backup,
  onClose,
  onConfirm,
}: RestoreModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testRestore, setTestRestore] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  async function handleRestore() {
    if (!password) {
      setError('Admin password is required');
      return;
    }

    if (!confirmed) {
      setError('You must confirm the restore operation');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(password, testRestore);
      setPassword('');
      setConfirmed(false);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Restore Backup</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>⚠️ Warning:</strong> This will{' '}
              {testRestore
                ? 'restore to staging environment'
                : 'overwrite your production database'}{' '}
              with data from the selected backup. This operation cannot be undone.
            </p>
          </div>

          {/* Backup Details */}
          {backup && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Backup Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-mono text-gray-900">
                    {new Date(backup.backup_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size</span>
                  <span className="font-mono text-gray-900">
                    {(backup.size_bytes / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-mono text-gray-900">{backup.backup_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-mono text-green-600">{backup.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Restore Type Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Restore To</h3>

            {/* Staging Option */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="restore-type"
                checked={testRestore}
                onChange={() => setTestRestore(true)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-gray-900">Staging Environment</p>
                <p className="text-xs text-gray-600 mt-1">
                  Safe testing of backup integrity without affecting production
                </p>
                <div className="flex items-center gap-1 text-green-600 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">Recommended</span>
                </div>
              </div>
            </label>

            {/* Production Option */}
            <label className="flex items-start gap-3 p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100">
              <input
                type="radio"
                name="restore-type"
                checked={!testRestore}
                onChange={() => setTestRestore(false)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-red-900">Production Database</p>
                <p className="text-xs text-red-700 mt-1">
                  Immediately replaces live data. All customers will see restored data.
                </p>
                <div className="flex items-center gap-1 text-red-600 mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-semibold">High Risk</span>
                </div>
              </div>
            </label>
          </div>

          {/* Password Confirmation */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Admin Password
              </div>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your admin password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Required for security confirmation
            </p>
          </div>

          {/* Final Confirmation Checkbox */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-900">
                I understand this{' '}
                {testRestore
                  ? 'will restore to staging'
                  : 'will replace production data'}{' '}
                and cannot be easily undone.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Data Loss Estimate */}
          <div className="text-xs text-gray-600 bg-blue-50 rounded-lg p-3">
            <strong>Data Loss Estimate:</strong> Up to 24 hours of data since the
            backup was created. This is within our RPO (Recovery Point Objective).
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : `${
                    testRestore
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`
            }`}
            disabled={loading}
          >
            {loading ? 'Restoring...' : 'Confirm Restore'}
          </button>
        </div>
      </div>
    </div>
  );
}
