import React, { useState, useEffect } from 'react';

interface WaitlistEntry {
  id: string;
  customer_name: string;
  service_type: string;
  position_in_queue: number;
  estimated_duration: number;
  status: string;
  wait_time_minutes?: number;
}

interface QueueStatus {
  total_waiting: number;
  avg_wait_time: number;
  estimated_wait_time: number;
  queue_display: WaitlistEntry[];
}

interface QueueDisplayProps {
  status: QueueStatus;
  isLoading?: boolean;
  refreshInterval?: number;
  onRefresh?: () => void;
}

export const QueueDisplay: React.FC<QueueDisplayProps> = ({
  status,
  isLoading = false,
  refreshInterval = 30000,
  onRefresh,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onRefresh]);

  const getServiceColor = (service: string): string => {
    const colors: Record<string, string> = {
      haircut: 'bg-blue-100 text-blue-800',
      fade: 'bg-purple-100 text-purple-800',
      beard: 'bg-orange-100 text-orange-800',
      shave: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[service.toLowerCase()] || colors.other;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Live Queue</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-refresh
          </label>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-3xl font-bold text-blue-600">{status.total_waiting}</div>
          <div className="text-sm text-gray-600">People Waiting</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-3xl font-bold text-green-600">{status.estimated_wait_time}</div>
          <div className="text-sm text-gray-600">Estimated Wait (min)</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-3xl font-bold text-yellow-600">{status.avg_wait_time}</div>
          <div className="text-sm text-gray-600">Average Wait (min)</div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-200 font-semibold text-gray-900">
          Queue Status
        </div>

        {status.queue_display.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Queue is empty
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {status.queue_display.map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-4 hover:bg-gray-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold">
                      {entry.position_in_queue}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {entry.customer_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.estimated_duration} minutes estimated
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getServiceColor(
                        entry.service_type
                      )}`}
                    >
                      {entry.service_type}
                    </span>

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      entry.status === 'waiting'
                        ? 'bg-blue-100 text-blue-800'
                        : entry.status === 'in-service'
                        ? 'bg-yellow-100 text-yellow-800'
                        : entry.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.status === 'in-service' && '🔄 In Service'}
                      {entry.status === 'waiting' && '⏳ Waiting'}
                      {entry.status === 'completed' && '✅ Completed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default QueueDisplay;
