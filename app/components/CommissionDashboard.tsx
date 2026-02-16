'use client';

import { useEffect, useState } from 'react';
import type { CommissionDashboardData, BarberCommissionSummary } from '@/lib/types/commission';

interface CommissionDashboardProps {
  shopId: string;
}

export function CommissionDashboard({ shopId }: CommissionDashboardProps) {
  const [data, setData] = useState<CommissionDashboardData | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sortBy, setSortBy] = useState<'commission' | 'appointments' | 'revenue'>('commission');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [month, sortBy]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/commissions/dashboard?shopId=${shopId}&month=${month}&sort_by=${sortBy}`
      );
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No data available</div>;
  }

  const { shop_totals, barber_summaries, top_earners } = data;

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commission Dashboard</h2>
        <div className="flex gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="commission">Sort by Commission</option>
            <option value="appointments">Sort by Appointments</option>
            <option value="revenue">Sort by Revenue</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Barbers</p>
          <p className="text-3xl font-bold">{shop_totals.total_barbers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Appointments</p>
          <p className="text-3xl font-bold">{shop_totals.total_appointments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-3xl font-bold">${shop_totals.total_revenue.toFixed(0)}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Commission</p>
          <p className="text-3xl font-bold text-blue-600">${shop_totals.total_commission.toFixed(0)}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Payout</p>
          <p className="text-3xl font-bold text-green-600">${shop_totals.total_earnings.toFixed(0)}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Avg Commission Rate</p>
            <p className="text-lg font-bold">{(shop_totals.commission_expense_percentage || 0).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-600">Total Bonuses</p>
            <p className="text-lg font-bold">${shop_totals.total_bonuses.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Deductions</p>
            <p className="text-lg font-bold">${shop_totals.total_deductions.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Tax Withheld</p>
            <p className="text-lg font-bold">${shop_totals.total_tax_withheld.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Top Earners */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold mb-4">Top Earners</h3>
        <div className="space-y-2">
          {top_earners.map((barber, idx) => (
            <div key={barber.barber_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400 w-6">#{idx + 1}</span>
                <div>
                  <p className="font-medium">{barber.barber_name}</p>
                  <p className="text-xs text-gray-600">{barber.appointments} appointments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600">${barber.net_earnings.toFixed(2)}</p>
                <p className="text-xs text-gray-600">${barber.total_revenue.toFixed(2)} revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Barbers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold mb-4">All Barbers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-3">Barber</th>
                <th className="text-center py-2 px-3">Appts</th>
                <th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">Commission</th>
                <th className="text-right py-2 px-3">Bonuses</th>
                <th className="text-right py-2 px-3">Deductions</th>
                <th className="text-right py-2 px-3">Tax</th>
                <th className="text-right py-2 px-3">Net Earnings</th>
              </tr>
            </thead>
            <tbody>
              {barber_summaries.map((barber) => (
                <tr key={barber.barber_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium">{barber.barber_name}</td>
                  <td className="py-3 px-3 text-center">{barber.appointments}</td>
                  <td className="py-3 px-3 text-right">${barber.total_revenue.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-medium">${barber.total_commission.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-green-600">${barber.bonuses.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-red-600">-${barber.deductions.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-orange-600">${barber.tax_withheld.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-bold">${barber.net_earnings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
