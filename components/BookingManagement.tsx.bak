'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function BookingManagement() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'reschedule' | 'cancel'>('details');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleLoading(true);

    try {
      const response = await fetch(`/api/public/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newDate: `${newDate}T${newTime}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        setActiveTab('details');
        alert('Booking rescheduled successfully!');
      } else {
        setError(data.error || 'Failed to reschedule');
      }
    } catch (err) {
      setError('Failed to reschedule booking');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setCancelLoading(true);

    try {
      const response = await fetch(`/api/public/bookings/${booking.id}/cancel`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reason: cancelReason,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        setActiveTab('details');
        alert(`Booking cancelled. Refund: $${data.refundAmount.toFixed(2)}`);
      } else {
        setError(data.error || 'Failed to cancel');
      }
    } catch (err) {
      setError('Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        Invalid booking link. Please check your email for the correct link.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
          <h1 className="text-3xl font-bold">Manage Your Booking</h1>
          <p className="text-blue-100 mt-2">View, reschedule, or cancel your appointment</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex">
          {['details', 'reschedule', 'cancel'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-4 px-6 font-semibold capitalize border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
              {error}
            </div>
          )}

          {activeTab === 'details' && booking && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Date & Time
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    {new Date(booking.scheduled_date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Status
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-full font-bold capitalize ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {booking.status}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                      Barber
                    </p>
                    <p className="text-lg font-bold text-slate-900">{booking.barber_name}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                      Service
                    </p>
                    <p className="text-lg font-bold text-slate-900">{booking.service_name}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                      Duration
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {booking.estimated_duration_minutes} minutes
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                      Amount
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      ${booking.total_amount_cents / 100}
                    </p>
                  </div>
                </div>
              </div>

              {booking.styling_notes && (
                <div className="border-t border-slate-200 pt-6">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2">
                    Notes
                  </p>
                  <p className="text-slate-700">{booking.styling_notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reschedule' && booking && (
            <form onSubmit={handleReschedule} className="space-y-6">
              <p className="text-slate-600">
                Select a new date and time for your appointment
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  New Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={rescheduleLoading || !newDate || !newTime}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition-all"
              >
                {rescheduleLoading ? 'Rescheduling...' : 'Reschedule Appointment'}
              </button>
            </form>
          )}

          {activeTab === 'cancel' && booking && (
            <form onSubmit={handleCancel} className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-700 font-semibold mb-2">Cancellation Policy</p>
                <p className="text-sm text-amber-600">
                  Cancellations up to 48 hours before your appointment are free. After 48 hours,
                  a $15 cancellation fee will apply.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you're cancelling..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                disabled={cancelLoading}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition-all"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
