'use client';

import { useState } from 'react';

interface ConfirmationScreenProps {
  booking: any;
  bookingToken: string;
  barber: any;
  service: any;
  shopSlug: string;
  onReschedule: () => void;
}

export function ConfirmationScreen({
  booking,
  bookingToken,
  barber,
  service,
  shopSlug,
  onReschedule,
}: ConfirmationScreenProps) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const scheduledDate = new Date(booking.scheduled_date);
  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleGenerateQR = () => {
    // QR code would be generated here
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL}/my-bookings?token=${bookingToken}`
    )}`;
    window.open(qrUrl, '_blank');
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    try {
      // Rating submission would go here
      console.log('Rating submitted:', { rating, comment });
      setShowRating(false);
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-4xl font-bold text-green-900 text-center mb-2">Booking Confirmed!</h2>
        <p className="text-center text-green-700">Your appointment has been secured</p>
      </div>

      {/* Appointment Details */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-6">Your Appointment</h3>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Date & Time</p>
            <p className="text-lg font-bold text-slate-900 mt-2">{dateStr}</p>
            <p className="text-xl font-bold text-blue-600">{timeStr}</p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">With</p>
            <p className="text-lg font-bold text-slate-900 mt-2">{barber.name}</p>
            <p className="text-slate-600 text-sm mt-1">Professional Barber</p>
          </div>

          <div className="border-l-4 border-pink-500 pl-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Service</p>
            <p className="text-lg font-bold text-slate-900 mt-2">{service.name}</p>
            <p className="text-slate-600 text-sm mt-1">${service.price.toFixed(2)}</p>
          </div>

          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Duration</p>
            <p className="text-lg font-bold text-slate-900 mt-2">{service.duration_minutes} Minutes</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4 pt-8 border-t border-slate-100">
          <button
            onClick={handleGenerateQR}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-lg font-bold transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate QR Code
          </button>

          <a
            href={`/my-bookings?token=${bookingToken}`}
            className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all"
          >
            Manage Booking
          </a>

          <button
            onClick={onReschedule}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-lg font-bold transition-all"
          >
            Book Another Appointment
          </button>
        </div>
      </div>

      {/* Rating Section */}
      {!showRating && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">⭐ Share Your Experience</h3>
          <p className="text-slate-600 mb-6">Help us improve by rating your appointment</p>
          <button
            onClick={() => setShowRating(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
          >
            Rate This Booking
          </button>
        </div>
      )}

      {showRating && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Rate Your Experience</h3>

          {/* Star Rating */}
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-125"
              >
                <svg
                  className={`w-10 h-10 ${
                    star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-300 text-slate-300'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your feedback..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            rows={4}
          />

          {/* Submit */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowRating(false)}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-all"
            >
              Skip
            </button>
            <button
              onClick={handleSubmitRating}
              disabled={submittingRating}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition-all"
            >
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Email */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-slate-700">
          ✓ Confirmation sent to <span className="font-bold">{booking.customer_email}</span>
        </p>
        <p className="text-xs text-slate-600 mt-2">Check spam if you don't see it</p>
      </div>
    </div>
  );
}
