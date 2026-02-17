'use client';

import { useState } from 'react';

interface CustomerFormProps {
  onSubmit: (info: any) => void;
  onBack: () => void;
  defaultEmail?: string;
}

export function CustomerForm({
  onSubmit,
  onBack,
  defaultEmail = '',
}: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: defaultEmail,
    phone: '',
    stylingNotes: '',
    firstTimeCustomer: true,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        ← Back
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Information</h2>
        <p className="text-slate-600 mb-8">We'll use this to confirm your appointment</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Smith"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 000-0000"
            />
          </div>

          {/* Styling Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Styling Notes or Preferences
            </label>
            <textarea
              value={formData.stylingNotes}
              onChange={(e) =>
                setFormData({ ...formData, stylingNotes: e.target.value })
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cut short on sides, long on top..."
              rows={4}
            />
          </div>

          {/* First Time Customer */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="firstTime"
              checked={formData.firstTimeCustomer}
              onChange={(e) =>
                setFormData({ ...formData, firstTimeCustomer: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="firstTime" className="text-sm text-slate-700">
              This is my first visit
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.email || !formData.phone}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-bold transition-all"
          >
            {loading ? 'Loading...' : 'Continue to Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
