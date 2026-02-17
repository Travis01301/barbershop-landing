'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Database, TrendingDown } from 'lucide-react';

interface BackupStatus {
  last_backup: any;
  hours_since_last_backup: number;
  rpo_status: 'healthy' | 'warning';
  next_scheduled: any;
  failed_backups_7d: number;
  statistics: any;
  size_trend: any[];
}

export default function BackupDashboard() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBackupStatus();
    const interval = setInterval(loadBackupStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function loadBackupStatus() {
    try {
      const response = await fetch('/api/admin/backups/status');
      if (!response.ok) throw new Error('Failed to load backup status');
      const { data } = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-4">Loading backup status...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!status) return <div className="p-4">No backup data available</div>;

  const lastBackupTime = status.last_backup
    ? new Date(status.last_backup.backup_date).toLocaleString()
    : 'Never';

  const isHealthy = status.rpo_status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Backup & Disaster Recovery</h2>
        <span className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          isHealthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {isHealthy ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {isHealthy ? 'Healthy' : 'Action Required'}
        </span>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Last Backup */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Last Backup</h3>
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 mb-2">{lastBackupTime}</p>
          <p className="text-2xl font-bold">
            {status.hours_since_last_backup}h ago
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {status.last_backup?.backup_type || 'N/A'} backup
          </p>
        </div>

        {/* Backup Size */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Latest Size</h3>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold">
            {status.last_backup
              ? (status.last_backup.size_bytes / 1024 / 1024).toFixed(2)
              : '0'}
            MB
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Storage compressed
          </p>
        </div>

        {/* RPO Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">RPO Status</h3>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold">24h</p>
          <p className="text-xs text-gray-500 mt-2">
            Max acceptable data loss
          </p>
        </div>

        {/* Failed Backups */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Failed (7d)</h3>
            <AlertCircle className={`w-5 h-5 ${
              status.failed_backups_7d > 0 ? 'text-red-600' : 'text-green-600'
            }`} />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {status.failed_backups_7d}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {status.failed_backups_7d > 0 ? 'Review logs' : 'All backups successful'}
          </p>
        </div>
      </div>

      {/* Backup Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Latest Backup Details</h3>
          {status.last_backup ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Backup Date</span>
                <span className="font-mono text-gray-900">
                  {new Date(status.last_backup.backup_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Type</span>
                <span className="font-mono text-gray-900">
                  {status.last_backup.backup_type}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Status</span>
                <span className={`font-mono ${
                  status.last_backup.status === 'completed'
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}>
                  {status.last_backup.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Duration</span>
                <span className="font-mono text-gray-900">
                  {status.last_backup.duration_seconds
                    ? `${(status.last_backup.duration_seconds / 60).toFixed(2)}m`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Integrity Check</span>
                <span className={`font-mono ${
                  status.last_backup.integrity_check_passed
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {status.last_backup.integrity_check_passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No backups available</p>
          )}
        </div>

        {/* Recovery Targets */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recovery Targets</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">RPO (Max Data Loss)</span>
                <span className="font-mono font-bold text-gray-900">24 hours</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    status.hours_since_last_backup <= 24
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      (status.hours_since_last_backup / 24) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current: {status.hours_since_last_backup}h
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">RTO (Time to Restore)</span>
                <span className="font-mono font-bold text-gray-900">2 hours</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                <p>Current backup can be restored within 2 hours of failure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => window.location.href = '/admin/backups/history'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View History
          </button>
          <button
            onClick={() => window.location.href = '/admin/backups/restore'}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Restore Backup
          </button>
          <button
            onClick={() => window.location.href = '/admin/backups/logs'}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            View Logs
          </button>
          <button
            onClick={() => window.location.href = '/admin/backups/settings'}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {!isHealthy && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Action Required</h4>
              <p className="text-sm text-yellow-800 mt-1">
                Last backup was more than 24 hours ago. Please ensure backups are running on schedule
                or manually trigger a backup immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
