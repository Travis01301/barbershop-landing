'use client';

import React, { useState, useEffect } from 'react';

interface Campaign {
  id: number;
  campaign_name: string;
  status: string;
  scheduled_time?: string;
  total_recipients: number;
  message_content: string;
}

interface SMSSchedulerProps {
  shopId: number;
  campaignId?: number;
}

export const SMSScheduler: React.FC<SMSSchedulerProps> = ({ shopId, campaignId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [shopId]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/sms/campaigns?shop_id=${shopId}&status=draft`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();
      setCampaigns(data.campaigns);

      if (campaignId) {
        const campaign = data.campaigns.find((c: Campaign) => c.id === campaignId);
        if (campaign) setSelectedCampaign(campaign);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCampaign) {
      setError('Please select a campaign');
      return;
    }

    if (!scheduledTime) {
      setError('Please select a time');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sms/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCampaign.id,
          scheduled_time: new Date(scheduledTime).toISOString(),
          status: 'scheduled',
        }),
      });

      if (!response.ok) throw new Error('Failed to schedule campaign');

      setSuccess(true);
      setScheduledTime('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (campaign: Campaign) => {
    if (!confirm('Send campaign now to all selected segments?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sms/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          segment_ids: [], // Would be selected via another UI component
          twilio_from_number: process.env.NEXT_PUBLIC_TWILIO_FROM,
        }),
      });

      if (!response.ok) throw new Error('Failed to send campaign');

      setSuccess(true);
      fetchCampaigns();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Schedule & Send Campaigns</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
          ✓ Operation completed successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campaign List */}
        <div>
          <h3 className="font-semibold mb-3">Draft Campaigns</h3>
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className={`p-3 border rounded cursor-pointer transition ${
                  selectedCampaign?.id === campaign.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <p className="font-medium text-sm">{campaign.campaign_name}</p>
                <p className="text-xs text-gray-500">
                  {campaign.total_recipients || 0} recipients
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Form */}
        {selectedCampaign && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-4">Schedule Campaign</h3>

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Campaign Details</h4>
              <div className="bg-white p-3 rounded border text-sm">
                <p className="font-medium">{selectedCampaign.campaign_name}</p>
                <p className="text-gray-600 text-xs mt-1">{selectedCampaign.message_content}</p>
              </div>
            </div>

            <form onSubmit={handleSchedule} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Send At</label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Scheduling...' : 'Schedule'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSendNow(selectedCampaign)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No draft campaigns found. Create one first!
        </div>
      )}
    </div>
  );
};
