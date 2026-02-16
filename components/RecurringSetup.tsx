'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface RecurringSetupProps {
  customerId: number;
  barberId?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function RecurringSetup({
  customerId,
  barberId,
  onSuccess,
  onError,
}: RecurringSetupProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: '',
    recurrenceType: 'weekly' as 'weekly' | 'bi-weekly' | 'monthly',
    dayOfWeek: 0,
    dayOfMonth: 15,
    timeOfDay: '10:00',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          barberId: barberId || undefined,
          serviceName: formData.serviceName,
          recurrenceType: formData.recurrenceType,
          dayOfWeek: formData.recurrenceType === 'weekly' || formData.recurrenceType === 'bi-weekly' 
            ? formData.dayOfWeek 
            : undefined,
          dayOfMonth: formData.recurrenceType === 'monthly' 
            ? formData.dayOfMonth 
            : undefined,
          timeOfDay: formData.timeOfDay,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create recurring appointment');
      }

      const data = await response.json();
      logger.info('Recurring appointment created', { id: data.recurring.id });

      setFormData({
        serviceName: '',
        recurrenceType: 'weekly',
        dayOfWeek: 0,
        dayOfMonth: 15,
        timeOfDay: '10:00',
        startDate: '',
        endDate: '',
        notes: '',
      });

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating recurring appointment', error);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Schedule Recurring Appointment</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Name */}
        <div>
          <label htmlFor="serviceName" className="block text-sm font-medium mb-2">
            Service
          </label>
          <input
            type="text"
            id="serviceName"
            name="serviceName"
            placeholder="e.g., Haircut, Beard Trim"
            value={formData.serviceName}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Recurrence Type */}
        <div>
          <label htmlFor="recurrenceType" className="block text-sm font-medium mb-2">
            Frequency
          </label>
          <select
            id="recurrenceType"
            name="recurrenceType"
            value={formData.recurrenceType}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Day of Week / Month */}
        {formData.recurrenceType === 'weekly' || formData.recurrenceType === 'bi-weekly' ? (
          <div>
            <label htmlFor="dayOfWeek" className="block text-sm font-medium mb-2">
              Day of Week
            </label>
            <select
              id="dayOfWeek"
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="dayOfMonth" className="block text-sm font-medium mb-2">
              Day of Month
            </label>
            <input
              type="number"
              id="dayOfMonth"
              name="dayOfMonth"
              min="1"
              max="31"
              value={formData.dayOfMonth}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Time of Day */}
        <div>
          <label htmlFor="timeOfDay" className="block text-sm font-medium mb-2">
            Time
          </label>
          <input
            type="time"
            id="timeOfDay"
            name="timeOfDay"
            value={formData.timeOfDay}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium mb-2">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            required
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date (optional) */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-2">
            End Date (Optional)
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes (Optional)
          </label>
          <input
            type="text"
            id="notes"
            name="notes"
            placeholder="Special instructions or preferences"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Creating...' : 'Create Recurring Appointment'}
        </button>
      </form>
    </div>
  );
}
