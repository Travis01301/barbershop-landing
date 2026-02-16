import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CampaignAnalyticsData {
  id: string;
  campaign_id: string;
  total_recipients: number;
  total_delivered: number;
  total_bounced: number;
  total_opened: number;
  total_clicked: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  conversion_count: number;
  conversion_value: number;
  revenue_generated: number;
  created_at: Date;
  updated_at: Date;
}

interface CampaignAnalyticsProps {
  analytics: CampaignAnalyticsData;
  campaignName?: string;
}

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({
  analytics,
  campaignName = 'Campaign',
}) => {
  const chartData = [
    {
      name: 'Metrics',
      delivered: analytics.total_delivered,
      opened: analytics.total_opened,
      clicked: analytics.total_clicked,
      bounced: analytics.total_bounced,
    },
  ];

  const getDeliveryRate = (): number => {
    if (analytics.total_recipients === 0) return 0;
    return Math.round(((analytics.total_delivered / analytics.total_recipients) * 100 * 100) / 100);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{campaignName} Analytics</h2>
        <p className="text-gray-600">Updated: {new Date(analytics.updated_at).toLocaleString()}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Delivery Rate</div>
          <div className="text-3xl font-bold text-blue-600">{getDeliveryRate()}%</div>
          <div className="text-xs text-gray-500 mt-2">
            {analytics.total_delivered} of {analytics.total_recipients} sent
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="text-sm text-gray-600 mb-1">Open Rate</div>
          <div className="text-3xl font-bold text-green-600">{analytics.open_rate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-2">
            {analytics.unique_opens} unique opens
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="text-sm text-gray-600 mb-1">Click Rate</div>
          <div className="text-3xl font-bold text-purple-600">{analytics.click_rate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-2">
            {analytics.unique_clicks} unique clicks
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <div className="text-sm text-gray-600 mb-1">Revenue Generated</div>
          <div className="text-3xl font-bold text-orange-600">
            {formatCurrency(analytics.revenue_generated)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {analytics.conversion_count} conversions
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Email Performance */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Email Performance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Delivered</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-300 rounded-full">
                  <div
                    className="h-2 bg-green-500 rounded-full"
                    style={{
                      width: `${(analytics.total_delivered / analytics.total_recipients) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics.total_delivered}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Bounced</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-300 rounded-full">
                  <div
                    className="h-2 bg-red-500 rounded-full"
                    style={{
                      width: `${(analytics.total_bounced / analytics.total_recipients) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics.total_bounced}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Bounce Rate</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.bounce_rate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Engagement Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Opens</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.total_opened}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Unique Opens</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.unique_opens}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Clicks</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.total_clicked}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Unique Clicks</span>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.unique_clicks}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold mb-4">Conversion & ROI</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600">Conversions</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {analytics.conversion_count}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.total_clicked > 0
                ? `${((analytics.conversion_count / analytics.total_clicked) * 100).toFixed(1)}% of clicks`
                : 'No clicks tracked'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Conversion Value</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(analytics.conversion_value)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Average per conversion</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Revenue Generated</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(analytics.revenue_generated)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total campaign value</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4">Insights & Recommendations</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          {analytics.open_rate < 20 && (
            <li>📧 Open rate is below average. Consider improving subject line clarity.</li>
          )}
          {analytics.click_rate < 5 && (
            <li>🔗 Click rate is low. Try adding clearer calls-to-action in your emails.</li>
          )}
          {analytics.bounce_rate > 3 && (
            <li>⚠️ Bounce rate is high. Review your mailing list for invalid addresses.</li>
          )}
          {analytics.conversion_count === 0 && (
            <li>💡 No conversions yet. Test different messaging or offers.</li>
          )}
          {analytics.open_rate >= 20 && analytics.click_rate >= 5 && (
            <li>✅ Great performance! Consider running similar campaigns.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
