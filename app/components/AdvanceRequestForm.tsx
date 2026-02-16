'use client';

import { useEffect, useState } from 'react';

interface AdvanceRequestFormProps {
  shopId: string;
  barberId: string;
  availableBalance: number;
}

export function AdvanceRequestForm({ shopId, barberId, availableBalance }: AdvanceRequestFormProps) {
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requestedAmount <= 0) {
      setMessage('✗ Please enter a valid amount');
      return;
    }

    if (requestedAmount > availableBalance) {
      setMessage('✗ Requested amount exceeds available balance');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/commissions/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          barber_id: barberId,
          requested_amount: requestedAmount,
          available_balance: availableBalance,
        }),
      });

      if (response.ok) {
        setMessage('✓ Advance request submitted successfully');
        setRequestedAmount(0);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error submitting request: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6">Request Commission Advance</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-600">Available Balance</p>
        <p className="text-3xl font-bold text-blue-600">${availableBalance.toFixed(2)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Request Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg">$</span>
            <input
              type="number"
              min="0.01"
              max={availableBalance}
              step="0.01"
              value={requestedAmount || ''}
              onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-lg"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Maximum: ${availableBalance.toFixed(2)}
          </p>
        </div>

        {requestedAmount > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Request Amount</p>
            <p className="text-2xl font-bold">${requestedAmount.toFixed(2)}</p>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || requestedAmount <= 0}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold mb-3">How Advances Work</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• You can request up to your available commission balance</li>
          <li>• Requests must be approved by management</li>
          <li>• Approved advances are paid within 24 hours</li>
          <li>• The advance amount is deducted from your next payout</li>
        </ul>
      </div>
    </div>
  );
}
