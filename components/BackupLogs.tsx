'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface BackupLog {
  id: string;
  log_level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: any;
}

interface BackupLogsProps {
  backupId?: string;
}

export default function BackupLogs({ backupId }: BackupLogsProps) {
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [backupId, filter]);

  async function loadLogs() {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('level', filter);
      if (backupId) params.append('backup_id', backupId);
      params.append('limit', '200');

      const response = await fetch(`/api/admin/backups/logs?${params}`);
      if (!response.ok) throw new Error('Failed to load logs');

      const { data } = await response.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getIconForLevel = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getColorForLevel = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredLogs = logs.filter((log) =>
    filter === 'all' ? true : log.log_level === filter
  );

  const errorCount = logs.filter((l) => l.log_level === 'error').length;
  const warningCount = logs.filter((l) => l.log_level === 'warning').length;

  if (loading) return <div className="p-4">Loading logs...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Backup Logs</h3>
        <div className="flex items-center gap-4 text-sm">
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errorCount} Error{errorCount !== 1 ? 's' : ''}
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              {warningCount} Warning{warningCount !== 1 ? 's' : ''}
            </div>
          )}
          <span className="text-gray-600">{filteredLogs.length} log entries</span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'error', 'warning', 'info', 'debug'].map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filter === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No logs found
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${getColorForLevel(
                log.log_level
              )}`}
              onClick={() =>
                setExpandedLog(expandedLog === log.id ? null : log.id)
              }
            >
              <div className="flex items-start gap-3">
                {getIconForLevel(log.log_level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900 break-words">
                      {log.message}
                    </p>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </p>

                  {/* Expanded Details */}
                  {expandedLog === log.id && log.metadata && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Metadata:
                      </p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
        >
          Refresh Logs
        </button>
      </div>
    </div>
  );
}
