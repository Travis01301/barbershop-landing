import React, { useState } from 'react';

export interface CampaignData {
  name: string;
  campaign_type: 'promotion' | 'service_announcement' | 'reactivation' | 'custom';
  subject: string;
  html_content: string;
  plain_text_content?: string;
  sender_name?: string;
  sender_email: string;
  reply_to_email?: string;
  preview_text?: string;
  notes?: string;
}

interface CampaignBuilderProps {
  onSave: (data: CampaignData) => Promise<void>;
  defaultValues?: Partial<CampaignData>;
  isLoading?: boolean;
}

const CAMPAIGN_TEMPLATES = {
  promotion: {
    subject: 'Special Offer Just for You!',
    html: '<div style="text-align: center; padding: 20px;"><h1>20% Off This Week!</h1><p>Visit us and save big on all services.</p><button style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Book Now</button></div>',
  },
  service_announcement: {
    subject: 'Introducing Our New Services',
    html: '<div style="padding: 20px;"><h1>New Services Available</h1><p>Check out our latest grooming services designed to make you look your best.</p><ul><li>Hot Towel Shaves</li><li>Scalp Treatments</li><li>Beard Design</li></ul></div>',
  },
  reactivation: {
    subject: "We Miss You! Come Back and Save 10%",
    html: '<div style="text-align: center; padding: 20px;"><h1>We Miss You!</h1><p>It has been a while since your last visit. Come back and enjoy 10% off your next appointment.</p><p>Use code: COMEBACK10</p></div>',
  },
};

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  onSave,
  defaultValues,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CampaignData>(
    defaultValues
      ? { ...defaultValues as CampaignData }
      : {
          name: '',
          campaign_type: 'custom',
          subject: '',
          html_content: '',
          sender_email: '',
        }
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemplateSelect = (templateKey: keyof typeof CAMPAIGN_TEMPLATES) => {
    const template = CAMPAIGN_TEMPLATES[templateKey];
    setFormData((prev) => ({
      ...prev,
      campaign_type: templateKey,
      subject: template.subject,
      html_content: template.html,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name || !formData.campaign_type || !formData.subject || !formData.html_content || !formData.sender_email) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create Campaign</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          Campaign saved successfully!
        </div>
      )}

      {/* Templates */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Quick Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(CAMPAIGN_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTemplateSelect(key as keyof typeof CAMPAIGN_TEMPLATES)}
              className="p-4 bg-white border border-blue-300 hover:border-blue-600 rounded-lg text-left transition hover:shadow-md"
            >
              <div className="font-semibold text-gray-900 text-sm">
                {key.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 mt-1">{template.subject}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Holiday Sale 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Campaign Type */}
        <div>
          <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Type *
          </label>
          <select
            id="campaign_type"
            name="campaign_type"
            value={formData.campaign_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="custom">Custom</option>
            <option value="promotion">Promotion</option>
            <option value="service_announcement">Service Announcement</option>
            <option value="reactivation">Reactivation</option>
          </select>
        </div>

        {/* Sender Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sender_email" className="block text-sm font-medium text-gray-700 mb-1">
              Sender Email *
            </label>
            <input
              type="email"
              id="sender_email"
              name="sender_email"
              value={formData.sender_email}
              onChange={handleInputChange}
              placeholder="noreply@barbershop.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="sender_name" className="block text-sm font-medium text-gray-700 mb-1">
              Sender Name
            </label>
            <input
              type="text"
              id="sender_name"
              name="sender_name"
              value={formData.sender_name || ''}
              onChange={handleInputChange}
              placeholder="Your Barbershop"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Subject & Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="preview_text" className="block text-sm font-medium text-gray-700 mb-1">
              Preview Text
            </label>
            <input
              type="text"
              id="preview_text"
              name="preview_text"
              value={formData.preview_text || ''}
              onChange={handleInputChange}
              placeholder="Short preview shown in inbox"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* HTML Content */}
        <div>
          <label htmlFor="html_content" className="block text-sm font-medium text-gray-700 mb-1">
            Email Content (HTML) *
          </label>
          <textarea
            id="html_content"
            name="html_content"
            value={formData.html_content}
            onChange={handleInputChange}
            placeholder="<div>Your email HTML...</div>"
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">Use {'{tracking_code}'} for pixel tracking</p>
        </div>

        {/* Reply To */}
        <div>
          <label htmlFor="reply_to_email" className="block text-sm font-medium text-gray-700 mb-1">
            Reply-To Email
          </label>
          <input
            type="email"
            id="reply_to_email"
            name="reply_to_email"
            value={formData.reply_to_email || ''}
            onChange={handleInputChange}
            placeholder="replies@barbershop.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
        >
          {isLoading ? 'Saving...' : 'Save Campaign'}
        </button>
      </form>
    </div>
  );
};

export default CampaignBuilder;
