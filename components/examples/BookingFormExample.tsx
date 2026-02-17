/**
 * Example: Appointment Booking Form with Analytics
 * Demonstrates tracking booking events
 */

'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function BookingFormExample() {
  const [barber, setBarber] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { trackAppointmentBooked, trackEvent } = useAnalytics();

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Track service selection
      trackEvent({
        name: 'page_view',
        timestamp: Date.now(),
        session_id: '',
        additionalParams: {
          section: 'booking_service_selected',
          service: serviceType,
        },
      });

      // Track barber selection
      trackEvent({
        name: 'page_view',
        timestamp: Date.now(),
        session_id: '',
        additionalParams: {
          section: 'booking_barber_selected',
          barber: barber,
        },
      });

      // Submit booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber,
          serviceType,
          date,
          time,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Track successful booking
        trackAppointmentBooked(
          serviceType,
          barber,
          data.price, // Booking value
          data.isFirstBooking, // Is this the user's first booking?
        );

        // Track booking confirmed event
        trackEvent({
          name: 'page_view',
          timestamp: Date.now(),
          session_id: '',
          additionalParams: {
            section: 'booking_confirmed',
            booking_id: data.bookingId,
          },
        });

        console.log('Booking confirmed');
      } else {
        console.error('Booking failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleBooking} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="service" className="block text-sm font-medium">
          Service
        </label>
        <select
          id="service"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select a service</option>
          <option value="haircut">Haircut</option>
          <option value="fade">Fade</option>
          <option value="beard_trim">Beard Trim</option>
          <option value="shampoo">Shampoo</option>
        </select>
      </div>

      <div>
        <label htmlFor="barber" className="block text-sm font-medium">
          Barber
        </label>
        <select
          id="barber"
          value={barber}
          onChange={(e) => setBarber(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select a barber</option>
          <option value="john">John</option>
          <option value="mike">Mike</option>
          <option value="sarah">Sarah</option>
        </select>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium">
          Time
        </label>
        <input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {isLoading ? 'Booking...' : 'Book Appointment'}
      </button>
    </form>
  );
}
