'use client';

import { useEffect, useState } from 'react';
import type { CommissionPayout } from '@/lib/types/commission';

interface CommissionPayoutsProps {
  shopId: string;
  barberId?: string;
}

export function CommissionPayouts({ shopId, barberId }: CommissionPayoutsProps) {
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'cash' | 'bank_transfer' | 'stripe_connect'>('cash');

  useEffect(() => {
    fetchPayouts();
  }, [status]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let url = `/api/commissions/payouts?shopId=${shopId}`;
      if (barberId) url += `&barberId=${barberId}`;
      if (status) url += `&status=${status}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPayout = (payoutId: string) => {
    setSelectedPayouts((prev) =>
      prev.includes(payoutId) ? prev.filter((id) => id !== payoutId) : [...prev, payoutId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPayouts.length === payouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(payouts.map((p) => p.id));
    }
  };

  const handleProcessPayouts = async () => {
    if (selectedPayouts.length === 0) {
      alert('Please select payouts to process');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/commissions/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          payout_ids: selectedPayouts,
          payout_method: payoutMethod,
        }),
      });

      if (response.ok) {
        alert('Payouts processed successfully');
        setSelectedPayouts([]);
        fetchPayouts();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert(`Error processing payouts: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading payouts...</div>;
  }

  const pendingPayouts = payouts.filter((p) => p.payout_status === 'pending');
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.net_payout, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold mb-6">Commission Payouts</h2>

        {/* Pending Summary */}
        {pendingPayouts.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                <p className="text-sm text-gray-600">{pendingPayouts.length} payouts</p>
              </div>
              <div>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md mb-2"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe_connect">Stripe Connect</option>
                </select>
                <button
                  onClick={handleProcessPayouts}
                  disabled={selectedPayouts.length === 0 || processing}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : `Process (${selectedPayouts.length})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 block mb-2">Filter by Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Payouts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-3">
                  <input
                    type="checkbox"
                    checked={selectedPayouts.length === payouts.length}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-3">Period</th>
                <th className="text-right py-3 px-3">Commission</th>
                <th className="text-right py-3 px-3">Bonuses</th>
                <th className="text-right py-3 px-3">Deductions</th>
                <th className="text-right py-3 px-3">Tax</th>
                <th className="text-right py-3 px-3">Net Payout</th>
                <th className="text-left py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.includes(payout.id)}
                      onChange={() => handleSelectPayout(payout.id)}
                      className="rounded"
                      disabled={payout.payout_status !== 'pending'}
                    />
                  </td>
                  <td className="py-3 px-3">
                    {new Date(payout.payout_period_start).toLocaleDateString()} -{' '}
                    {new Date(payout.payout_period_end).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-right">${payout.total_commission.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-green-600">${payout.bonuses.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-red-600">-${payout.deductions.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">${payout.tax_withheld.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-bold">${payout.net_payout.toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        payout.payout_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : payout.payout_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : payout.payout_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {payout.payout_status}
                    </span>
                  </td>
                  <td className="py-3 px-3">{payout.payout_method || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payouts.length === 0 && (
          <div className="text-center py-8 text-gray-600">No payouts found</div>
        )}
      </div>
    </div>
  );
}
