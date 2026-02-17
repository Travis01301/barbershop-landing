'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface WaitlistEntry {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  priority_level: 'standard' | 'priority';
  priority_rank: number;
  preferred_date: string;
  preferred_time: string | null;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  created_at: string;
}

interface WaitlistDisplayProps {
  barberId: number;
  date?: string;
  onRefresh?: () => void;
}

export default function WaitlistDisplay({ barberId, date, onRefresh }: WaitlistDisplayProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
  }, [barberId, date]);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const params = new URLSearchParams();
      params.append('barberId', barberId.toString());
      if (date) params.append('date', date);

      const response = await fetch(`/api/waitlist?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch waitlist');
      }

      const data = await response.json();
      setWaitlist(data.waitlist || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch waitlist';
      logger.error('Error fetching waitlist', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (waitlistId: number, appointmentId: number) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/waitlist/${waitlistId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to promote customer');
      }

      logger.info('Customer promoted from waitlist', { waitlistId });
      fetchWaitlist();
      onRefresh?.();
    } catch (err) {
      logger.error('Error promoting customer', err);
      setError(err instanceof Error ? err.message : 'Failed to promote customer');
    }
  };

  const handleCancel = async (waitlistId: number) => {
    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch(`/api/waitlist/${waitlistId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel waitlist entry');
      }

      logger.info('Waitlist entry cancelled', { waitlistId });
      fetchWaitlist();
    } catch (err) {
      logger.error('Error cancelling waitlist entry', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel entry');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading waitlist...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        {error}
      </div>
    );
  }

  if (waitlist.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No customers on waitlist
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Waitlist ({waitlist.length})</h3>

      <div className="space-y-2">
        {waitlist.map((entry) => (
          <div
            key={entry.id}
            className={`p-4 border rounded-lg ${
              entry.priority_level === 'priority'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{entry.priority_rank}</span>
                  <span className="font-semibold">{entry.customer_name}</span>
                  {entry.priority_level === 'priority' && (
                    <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded font-medium">
                      Priority
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📧 {entry.customer_email}
                </div>
                <div className="text-sm text-gray-600">
                  📱 {entry.customer_phone}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  📅 {entry.preferred_date}
                  {entry.preferred_time && ` @ ${entry.preferred_time}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Joined: {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePromote(entry.id, 1)} // Placeholder appointmentId
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Promote
                </button>
                <button
                  onClick={() => handleCancel(entry.id)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
