'use client';

import React, { useState } from 'react';

export interface BarberSuggestionData {
  barberId: string;
  barberName: string;
  recommendationScore: number;
  noShowRate: number;
  customerHistoryWithBarber: {
    previousAppointments: number;
    noShowCount: number;
  };
  availabilityPercentage: number;
  reasoning: string;
}

export interface BarberSuggestionProps {
  shopId: string;
  customerId: string;
  appointmentDate: Date;
  onSelect?: (barber: BarberSuggestionData) => void;
  showFullDetails?: boolean;
}

/**
 * BarberSuggestion Component
 *
 * Displays the recommended barber for a new appointment based on:
 * - Barber's reliability (no-show rate)
 * - Customer's history with the barber
 * - Current availability
 *
 * Example:
 * <BarberSuggestion shopId={shopId} customerId={customerId} appointmentDate={date} onSelect={handleSelect} />
 */
export const BarberSuggestion: React.FC<BarberSuggestionProps> = ({
  shopId,
  customerId,
  appointmentDate,
  onSelect,
  showFullDetails = true,
}) => {
  const [suggestion, setSuggestion] = useState<BarberSuggestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchSuggestion = async () => {
      try {
        const response = await fetch('/api/ai/suggest-barber', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId,
            customerId,
            appointmentDate: appointmentDate.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch barber suggestion');
        }

        const data = await response.json();
        setSuggestion(data.suggestion);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching suggestion:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestion();
  }, [shopId, customerId, appointmentDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-gray-500">Finding best barber...</div>
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

  if (!suggestion) {
    return (
      <div className="text-center text-gray-500 py-6">
        No barbers available.
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-blue-900">Recommended Barber</h3>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {suggestion.barberName}
          </p>

          {showFullDetails && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span className="text-sm font-medium text-gray-700">
                  Reliability Score
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${suggestion.recommendationScore}%`,
                      }}
                    />
                  </div>
                  <span className="font-bold text-green-600">
                    {suggestion.recommendationScore.toFixed(0)}/100
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span className="text-sm font-medium text-gray-700">
                  No-Show Rate
                </span>
                <span className="font-bold text-orange-600">
                  {suggestion.noShowRate.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-white p-3">
                <span className="text-sm font-medium text-gray-700">
                  Availability
                </span>
                <span className="font-bold text-green-600">
                  {suggestion.availabilityPercentage.toFixed(0)}%
                </span>
              </div>

              {suggestion.customerHistoryWithBarber.previousAppointments > 0 && (
                <div className="rounded-lg bg-white p-3">
                  <p className="text-sm font-medium text-gray-700">
                    Previous appointments with you:{' '}
                    <span className="font-bold text-blue-600">
                      {suggestion.customerHistoryWithBarber.previousAppointments}
                    </span>
                  </p>
                  {suggestion.customerHistoryWithBarber.noShowCount > 0 && (
                    <p className="text-xs text-gray-600">
                      Past no-shows:{' '}
                      {suggestion.customerHistoryWithBarber.noShowCount}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-medium text-gray-700">Why this barber?</p>
                <p className="mt-1 text-sm text-gray-600">
                  {suggestion.reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {onSelect && (
          <button
            onClick={() => onSelect(suggestion)}
            className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Select
          </button>
        )}
      </div>
    </div>
  );
};

export default BarberSuggestion;
