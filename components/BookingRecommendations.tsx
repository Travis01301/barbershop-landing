'use client';

import React, { useEffect, useState } from 'react';

export interface BookingRecommendation {
  dayOfWeek: number;
  dayName: string;
  hour: number;
  timeSlot: string;
  noShowRateAtTime: number;
  isBusiest: boolean;
  completionRate: number;
  recommendation: 'optimal' | 'good' | 'busy' | 'avoid';
}

export interface BookingRecommendationsProps {
  shopId: string;
  onSelectTime?: (dayOfWeek: number, hour: number) => void;
}

/**
 * BookingRecommendations Component
 *
 * Displays optimal booking times based on historical patterns.
 * Shows busy times vs slow times and completion rates.
 *
 * Example:
 * <BookingRecommendations shopId={shopId} onSelectTime={handleSelect} />
 */
export const BookingRecommendations: React.FC<BookingRecommendationsProps> = ({
  shopId,
  onSelectTime,
}) => {
  const [recommendations, setRecommendations] = useState<BookingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'optimal' | 'busy' | 'avoid'>('optimal');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(
          `/api/ai/booking-recommendations?shopId=${shopId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch booking recommendations');
        }

        const data = await response.json();
        setRecommendations(data.recommendations || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [shopId]);

  const filteredRecommendations =
    filter === 'all'
      ? recommendations
      : recommendations.filter((r) => r.recommendation === filter);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'optimal':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'good':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'busy':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'avoid':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRecommendationLabel = (recommendation: string) => {
    switch (recommendation) {
      case 'optimal':
        return '⭐ Best Time';
      case 'good':
        return '✓ Good Time';
      case 'busy':
        return '📈 Busy';
      case 'avoid':
        return '❌ Avoid';
      default:
        return recommendation;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading recommendations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Optimal Booking Times</h3>
        <div className="flex gap-2">
          {['all', 'optimal', 'busy', 'avoid'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            No recommendations match the selected filter.
          </div>
        ) : (
          filteredRecommendations.map((rec, idx) => (
            <div
              key={idx}
              onClick={() =>
                onSelectTime && onSelectTime(rec.dayOfWeek, rec.hour)
              }
              className={`cursor-pointer rounded-lg border p-4 transition ${getRecommendationColor(
                rec.recommendation
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{rec.dayName}</span>
                    <span className="text-sm font-medium text-gray-600">
                      {rec.timeSlot}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-sm">
                    <span>
                      No-shows:{' '}
                      <span className="font-semibold">
                        {rec.noShowRateAtTime.toFixed(1)}%
                      </span>
                    </span>
                    <span>
                      Completion:{' '}
                      <span className="font-semibold">
                        {rec.completionRate.toFixed(1)}%
                      </span>
                    </span>
                    {rec.isBusiest && (
                      <span className="text-yellow-700">Busiest time</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">
                    {getRecommendationLabel(rec.recommendation)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookingRecommendations;
