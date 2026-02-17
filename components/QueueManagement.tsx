import React, { useState } from 'react';

interface WaitlistEntry {
  id: string;
  customer_name: string;
  service_type: string;
  position_in_queue: number;
  estimated_duration: number;
  status: 'waiting' | 'in-service' | 'completed' | 'no-show' | 'cancelled';
  barber_id?: string;
}

interface Barber {
  id: string;
  name: string;
  availability: 'available' | 'busy' | 'offline';
}

interface QueueManagementProps {
  queue: WaitlistEntry[];
  barbers: Barber[];
  onAssignBarber: (queueId: string, barberId: string) => Promise<void>;
  onCompleteService: (queueId: string) => Promise<void>;
  onMarkNoShow: (queueId: string) => Promise<void>;
  onCancelEntry: (queueId: string) => Promise<void>;
  isLoading?: boolean;
}

export const QueueManagement: React.FC<QueueManagementProps> = ({
  queue,
  barbers,
  onAssignBarber,
  onCompleteService,
  onMarkNoShow,
  onCancelEntry,
  isLoading = false,
}) => {
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleAssignBarber = async () => {
    if (!selectedQueueId || !selectedBarberId) {
      setError('Please select a queue entry and barber');
      return;
    }

    try {
      setError(null);
      await onAssignBarber(selectedQueueId, selectedBarberId);
      setSelectedQueueId(null);
      setSelectedBarberId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign barber');
    }
  };

  const handleCompleteService = async (queueId: string) => {
    try {
      setError(null);
      await onCompleteService(queueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete service');
    }
  };

  const handleMarkNoShow = async (queueId: string) => {
    if (confirm('Mark as no-show? This customer will be removed from queue.')) {
      try {
        setError(null);
        await onMarkNoShow(queueId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as no-show');
      }
    }
  };

  const handleCancelEntry = async (queueId: string) => {
    if (confirm('Cancel this queue entry? This action cannot be undone.')) {
      try {
        setError(null);
        await onCancelEntry(queueId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel entry');
      }
    }
  };

  const getBarberName = (barberId?: string) => {
    if (!barberId) return 'Unassigned';
    const barber = barbers.find((b) => b.id === barberId);
    return barber?.name || 'Unknown';
  };

  const getBarberColor = (availability: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      busy: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-gray-100 dark:bg-slate-800 text-gray-800',
    };
    return colors[availability] || colors.offline;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Queue Management</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Barber Assignment Section */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Assign Barber to Customer</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedQueueId || ''}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Select customer...</option>
            {queue
              .filter((entry) => entry.status === 'waiting')
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.position_in_queue}. {entry.customer_name} - {entry.service_type}
                </option>
              ))}
          </select>

          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Select barber...</option>
            {barbers
              .filter((barber) => barber.availability === 'available')
              .map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
          </select>

          <button
            onClick={handleAssignBarber}
            disabled={isLoading || !selectedQueueId || !selectedBarberId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-semibold transition"
          >
            {isLoading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-200 font-semibold text-gray-900 dark:text-slate-100 grid grid-cols-12 gap-4">
          <div className="col-span-1">Pos.</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Service</div>
          <div className="col-span-2">Barber</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
        </div>

        {queue.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Queue is empty
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queue.map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-4 hover:bg-gray-100 dark:bg-slate-800 transition grid grid-cols-12 gap-4 items-center"
              >
                <div className="col-span-1">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {entry.position_in_queue}
                  </span>
                </div>

                <div className="col-span-3">
                  <div className="font-semibold text-gray-900">{entry.customer_name}</div>
                  <div className="text-xs text-gray-500">{entry.estimated_duration}m</div>
                </div>

                <div className="col-span-2">
                  <span className="px-2 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded">
                    {entry.service_type}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-sm font-medium">{getBarberName(entry.barber_id)}</span>
                </div>

                <div className="col-span-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    entry.status === 'in-service' ? 'bg-yellow-100 text-yellow-800' :
                    entry.status === 'waiting' ? 'bg-blue-100 text-blue-800' :
                    entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 dark:bg-slate-800 text-gray-800'
                  }`}>
                    {entry.status}
                  </span>
                </div>

                <div className="col-span-2 flex gap-2">
                  {entry.status === 'in-service' && (
                    <>
                      <button
                        onClick={() => handleCompleteService(entry.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded"
                        title="Mark as completed"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleMarkNoShow(entry.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded"
                        title="Mark as no-show"
                      >
                        ✗
                      </button>
                    </>
                  )}
                  {entry.status === 'waiting' && (
                    <button
                      onClick={() => handleCancelEntry(entry.id)}
                      disabled={isLoading}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded"
                      title="Cancel entry"
                    >
                      ✗
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueManagement;
