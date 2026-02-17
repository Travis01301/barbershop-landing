import React, { useState } from 'react';

export interface CampaignScheduleData {
  campaignId: string;
  recipientEmails: string[];
  sendNow: boolean;
  scheduledSendAt?: string;
  segmentFilters?: {
    serviceType?: string;
    frequency?: 'frequent' | 'occasional' | 'rare';
    lastVisitDays?: number;
  };
}

interface CampaignSchedulerProps {
  campaignId?: string;
  defaultRecipients?: string[];
  onSchedule: (data: CampaignScheduleData) => Promise<void>;
  isLoading?: boolean;
}

export const CampaignScheduler: React.FC<CampaignSchedulerProps> = ({
  campaignId = '',
  defaultRecipients = [],
  onSchedule,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CampaignScheduleData>({
    campaignId,
    recipientEmails: defaultRecipients,
    sendNow: true,
    scheduledSendAt: '',
  });

  const [recipientInput, setRecipientInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddRecipient = () => {
    const email = recipientInput.trim().toLowerCase();

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email address');
      return;
    }

    if (formData.recipientEmails.includes(email)) {
      setError('Email already added');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      recipientEmails: [...prev.recipientEmails, email],
    }));
    setRecipientInput('');
    setError(null);
  };

  const handleRemoveRecipient = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      recipientEmails: prev.recipientEmails.filter((e) => e !== email),
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSegmentChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      segmentFilters: {
        ...prev.segmentFilters,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.recipientEmails.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    if (!formData.sendNow && !formData.scheduledSendAt) {
      setError('Please select a send time');
      return;
    }

    try {
      await onSchedule(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule campaign');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Schedule Campaign</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          Campaign scheduled successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Send Timing */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Send Timing</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="sendNow"
                checked={formData.sendNow}
                onChange={() => setFormData((prev) => ({ ...prev, sendNow: true }))}
                className="w-4 h-4"
                disabled={isLoading}
              />
              <span className="text-gray-700 font-medium">Send Now</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="sendNow"
                checked={!formData.sendNow}
                onChange={() => setFormData((prev) => ({ ...prev, sendNow: false }))}
                className="w-4 h-4"
                disabled={isLoading}
              />
              <span className="text-gray-700 font-medium">Schedule for Later</span>
            </label>

            {!formData.sendNow && (
              <div className="ml-7">
                <input
                  type="datetime-local"
                  name="scheduledSendAt"
                  value={formData.scheduledSendAt}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>

        {/* Recipient Segments */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recipient Segments (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                value={formData.segmentFilters?.serviceType || ''}
                onChange={(e) => handleSegmentChange('serviceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              >
                <option value="">All Services</option>
                <option value="haircut">Haircut</option>
                <option value="fade">Fade</option>
                <option value="beard">Beard Trim</option>
                <option value="shave">Straight Razor Shave</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visit Frequency
              </label>
              <select
                value={formData.segmentFilters?.frequency || ''}
                onChange={(e) => handleSegmentChange('frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              >
                <option value="">All Frequencies</option>
                <option value="frequent">Frequent (4+ visits/month)</option>
                <option value="occasional">Occasional (1-3 visits/month)</option>
                <option value="rare">Rare (&lt;1 visit/month)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Visit (Days)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 30 to target inactive customers"
                value={formData.segmentFilters?.lastVisitDays || ''}
                onChange={(e) =>
                  handleSegmentChange('lastVisitDays', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Recipients</h3>

          <div className="mb-4 flex gap-2">
            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleAddRecipient}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium"
            >
              Add
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-64 overflow-y-auto">
            {formData.recipientEmails.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recipients added yet</p>
            ) : (
              <div className="space-y-2">
                {formData.recipientEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                  >
                    <span className="text-sm text-gray-900">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 disabled:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {formData.recipientEmails.length} recipient{formData.recipientEmails.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
        >
          {isLoading ? 'Scheduling...' : formData.sendNow ? 'Send Now' : 'Schedule Campaign'}
        </button>
      </form>
    </div>
  );
};

export default CampaignScheduler;
