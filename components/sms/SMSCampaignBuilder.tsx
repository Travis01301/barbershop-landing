'use client';

import React, { useState, useEffect } from 'react';

interface SMSCampaignBuilderProps {
  shopId: number;
  onCampaignCreated?: (campaignId: number) => void;
}

export const SMSCampaignBuilder: React.FC<SMSCampaignBuilderProps> = ({
  shopId,
  onCampaignCreated,
}) => {
  const [formData, setFormData] = useState({
    campaign_name: '',
    campaign_type: 'promotion',
    message_content: '',
    sender_id: 'BarberShop',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const maxChars = 160;
  const smsPages = Math.ceil(charCount / maxChars);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'message_content') {
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.campaign_name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!formData.message_content.trim()) {
      setError('Message content is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sms/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to create campaign');

      const data = await response.json();
      setSuccess(true);
      onCampaignCreated?.(data.campaign.id);

      // Reset form
      setFormData({
        campaign_name: '',
        campaign_type: 'promotion',
        message_content: '',
        sender_id: 'BarberShop',
      });
      setCharCount(0);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create SMS Campaign</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 rounded">
          ✓ Campaign created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Campaign Name</label>
          <input
            type="text"
            name="campaign_name"
            value={formData.campaign_name}
            onChange={handleChange}
            placeholder="e.g., Summer Promo 2024"
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Campaign Type</label>
            <select
              name="campaign_type"
              value={formData.campaign_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="promotion">Promotion</option>
              <option value="announcement">Announcement</option>
              <option value="referral">Referral</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sender ID</label>
            <input
              type="text"
              name="sender_id"
              value={formData.sender_id}
              onChange={handleChange}
              placeholder="Your shop name"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-sm font-medium">Message Content</label>
            <span className={`text-sm ${charCount > maxChars ? 'text-red-600' : 'text-gray-500'}`}>
              {charCount}/{maxChars} ({smsPages} SMS)
            </span>
          </div>
          <textarea
            name="message_content"
            value={formData.message_content}
            onChange={handleChange}
            placeholder="Enter your SMS message (160 characters per SMS)"
            maxLength={160 * 3} // Allow up to 3 SMS messages
            rows={4}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <h4 className="font-semibold mb-2">Message Preview</h4>
          <div className="bg-white dark:bg-slate-900 p-3 rounded border border-blue-200 text-sm">
            <p className="text-gray-800">{formData.message_content || '(Your message will appear here)'}</p>
            <p className="text-xs text-gray-500 mt-2">— {formData.sender_id}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  );
};
