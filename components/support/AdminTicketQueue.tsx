'use client';

import React, { useState, useEffect } from 'react';

interface DashboardData {
  openTickets: number;
  urgentTickets: number;
  byPriority: Array<{ priority: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  avgSatisfactionScore: number;
  recentTickets: Array<any>;
  slaBreaches: number;
}

interface AdminTicketQueueProps {
  shopId: string;
}

export default function AdminTicketQueue({ shopId }: AdminTicketQueueProps) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/support/admin/dashboard?shop_id=${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard');

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  if (!dashboard) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm font-semibold mb-1">Open Tickets</div>
          <div className="text-4xl font-bold text-blue-600">{dashboard.openTickets}</div>
          <div className="text-xs text-gray-500 mt-2">Need attention</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm font-semibold mb-1">Urgent Tickets</div>
          <div className="text-4xl font-bold text-red-600">{dashboard.urgentTickets}</div>
          <div className="text-xs text-gray-500 mt-2">Requires immediate action</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm font-semibold mb-1">Avg Response Time</div>
          <div className="text-4xl font-bold text-green-600">
            {Math.round(dashboard.avgResponseTimeMinutes)}m
          </div>
          <div className="text-xs text-gray-500 mt-2">Minutes to first response</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 text-sm font-semibold mb-1">Customer Satisfaction</div>
          <div className="text-4xl font-bold text-purple-600">
            {dashboard.avgSatisfactionScore.toFixed(1)}⭐
          </div>
          <div className="text-xs text-gray-500 mt-2">Average rating</div>
        </div>
      </div>

      {/* SLA Alert */}
      {dashboard.slaBreaches > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-semibold">⚠️ {dashboard.slaBreaches} SLA breaches detected</p>
          <p className="text-sm">Some tickets have exceeded their response/resolution time</p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Priority */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Priority</h3>
          <div className="space-y-2">
            {dashboard.byPriority.map(item => (
              <div key={item.priority} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{item.priority}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">{item.count}</span>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(item.count / Math.max(...dashboard.byPriority.map(p => p.count), 1)) * 100}px`,
                      backgroundColor: {
                        low: '#10B981',
                        medium: '#F59E0B',
                        high: '#EF4444',
                        urgent: '#8B5CF6'
                      }[item.priority] || '#3B82F6'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
          <div className="space-y-2">
            {dashboard.byStatus.map(item => (
              <div key={item.status} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{item.status.replace('_', ' ')}</span>
                <span className="text-xl font-bold text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Category</h3>
          <div className="space-y-2">
            {dashboard.byCategory.map(item => (
              <div key={item.category} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{item.category.replace('_', ' ')}</span>
                <span className="text-xl font-bold text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tickets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Ticket</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Category</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Status</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Priority</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentTickets.map(ticket => (
                <tr key={ticket.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3 font-semibold text-blue-600">{ticket.ticket_number}</td>
                  <td className="py-2 px-3">{ticket.name}</td>
                  <td className="py-2 px-3 capitalize">{ticket.category.replace('_', ' ')}</td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-3 capitalize">{ticket.priority}</td>
                  <td className="py-2 px-3 text-gray-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-700 mb-1">Average First Response Time</p>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(dashboard.avgResponseTimeMinutes)} minutes
            </p>
          </div>
          <div>
            <p className="text-gray-700 mb-1">Average Resolution Time</p>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(dashboard.avgResolutionTimeMinutes)} minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
