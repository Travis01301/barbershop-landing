'use client';

import React, { useState, useEffect } from 'react';

interface CostAnalysisProps {
  shopId: number;
}

export const CostAnalysis: React.FC<CostAnalysisProps> = ({ shopId }) => {
  const [costPerAppointment, setCostPerAppointment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    fetchCostAnalysis();
  }, [shopId, fromDate, toDate]);

  const fetchCostAnalysis = async () => {
    try {
      setLoading(true);
      let url = `/api/inventory/cost-per-appointment?shop_id=${shopId}`;

      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch cost analysis');

      const data = await response.json();
      setCostPerAppointment(data.costPerAppointment);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Calculating costs...</div>;
  }

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded">
      <h3 className="text-2xl font-bold mb-4">Cost Analysis</h3>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset Dates
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-gray-600 dark:text-slate-400 mb-2">Cost Per Appointment</p>
            <p className="text-4xl font-bold text-purple-600">
              ${costPerAppointment?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Average supply cost per customer appointment
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
            <h4 className="font-semibold mb-3">Insights</h4>
            <ul className="text-sm space-y-2 text-gray-700">
              <li>
                • Track supply expenses to optimize pricing and profitability
              </li>
              <li>
                • Use this metric to benchmark against industry standards
              </li>
              <li>
                • High costs may indicate inefficient supply usage
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
