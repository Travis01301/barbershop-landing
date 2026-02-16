'use client';

import { useEffect, useState } from 'react';
import type { MonthlyCommissionStatement } from '@/lib/types/commission';

interface CommissionStatementProps {
  shopId: string;
  barberId: string;
  month?: string;
}

export function CommissionStatement({ shopId, barberId, month: initialMonth }: CommissionStatementProps) {
  const [statement, setStatement] = useState<MonthlyCommissionStatement | null>(null);
  const [month, setMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatement();
  }, [month]);

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commissions/${barberId}/month/${month}?shopId=${shopId}`);
      if (response.ok) {
        setStatement(await response.json());
      }
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF generation
    alert('PDF download coming soon');
  };

  if (loading) {
    return <div className="text-center py-8">Loading statement...</div>;
  }

  if (!statement) {
    return <div className="text-center py-8 text-gray-600">No statement available</div>;
  }

  const prevMonth = new Date(new Date(month + '-01').getTime() - 86400000).toISOString().slice(0, 7);
  const nextMonth = new Date(new Date(month + '-01').getTime() + 86400000 * 32).toISOString().slice(0, 7);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Monthly Commission Statement</h2>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Download PDF
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setMonth(prevMonth)}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Previous
        </button>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={() => setMonth(nextMonth)}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Next →
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Appointments</p>
          <p className="text-2xl font-bold">{statement.total_appointments}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold">${statement.total_revenue.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Commission Earned</p>
          <p className="text-2xl font-bold text-blue-600">${statement.total_commission.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Net Earnings</p>
          <p className="text-2xl font-bold text-green-600">${statement.net_earnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Service</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-right py-2 px-3">Rate</th>
                <th className="text-right py-2 px-3">Commission</th>
              </tr>
            </thead>
            <tbody>
              {statement.transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3">{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                  <td className="py-3 px-3">{transaction.service_type}</td>
                  <td className="text-right py-3 px-3">${transaction.service_price.toFixed(2)}</td>
                  <td className="text-right py-3 px-3">{transaction.commission_rate.toFixed(1)}%</td>
                  <td className="text-right py-3 px-3 font-medium">${transaction.base_commission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Earnings Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Commission</span>
              <span className="font-medium">${statement.total_commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bonuses</span>
              <span className="font-medium text-green-600">${statement.total_bonuses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Deductions</span>
              <span className="font-medium">-${statement.total_deductions.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-orange-600 border-t pt-2">
              <span>Tax Withheld</span>
              <span className="font-medium">-${statement.tax_withheld.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Year-to-Date Summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Year-to-Date</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Appointments</span>
              <span className="font-medium">{statement.year_to_date_summary.total_appointments}</span>
            </div>
            <div className="flex justify-between">
              <span>Revenue</span>
              <span className="font-medium">${statement.year_to_date_summary.total_revenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Commission</span>
              <span className="font-medium">${statement.year_to_date_summary.total_commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Net Earnings</span>
              <span className="font-medium">${statement.year_to_date_summary.total_earnings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
