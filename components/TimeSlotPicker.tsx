'use client';

import { useEffect, useState } from 'react';

interface TimeSlotPickerProps {
  shopSlug: string;
  barberId: number;
  serviceId: number;
  onSelect: (date: string, time: string) => void;
  onBack: () => void;
}

export function TimeSlotPicker({
  shopSlug,
  barberId,
  serviceId,
  onSelect,
  onBack,
}: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const today = new Date();
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/shops/${shopSlug}/check-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barberId,
            date: selectedDate,
            serviceId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setSlots(data.availableSlots);
          setError('');
        } else {
          setError(data.error || 'Failed to load slots');
        }
      } catch (err) {
        setError('Failed to load time slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, shopSlug, barberId, serviceId]);

  const handleSlotSelect = (slot: any) => {
    onSelect(selectedDate, slot.startTime);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Select a Date & Time</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Choose from available slots</p>

        {/* Date Picker */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today.toISOString().split('T')[0]}
            max={maxDate.toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Time</label>
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {slots.length === 0 && !loading && !error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
                No available slots for this date
              </div>
            )}

            {slots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => handleSlotSelect(slot)}
                    className="py-3 px-3 border-2 border-slate-300 rounded-lg text-sm font-semibold hover:border-blue-500 hover:bg-blue-50 dark:bg-blue-900/20 transition-all"
                  >
                    {slot.display}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
