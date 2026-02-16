'use client';

import { useState, useEffect } from 'react';
import type { CommissionRate } from '@/lib/types/commission';

interface TieredRule {
  threshold: number;
  rate: number;
}

export function CommissionRateConfig({ shopId }: { shopId: string }) {
  const [rateType, setRateType] = useState<'flat' | 'tiered' | 'service_specific'>('flat');
  const [baseRate, setBaseRate] = useState(40);
  const [tieredRules, setTieredRules] = useState<TieredRule[]>([
    { threshold: 500, rate: 45 },
    { threshold: 1000, rate: 50 },
  ]);
  const [serviceRates, setServiceRates] = useState<Record<string, number>>({
    haircut: 45,
    'beard trim': 40,
    specialty: 50,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddTieredRule = () => {
    setTieredRules([...tieredRules, { threshold: 0, rate: 0 }]);
  };

  const handleRemoveTieredRule = (index: number) => {
    setTieredRules(tieredRules.filter((_, i) => i !== index));
  };

  const handleAddServiceRate = (service: string) => {
    const newService = prompt('Enter service name:');
    if (newService) {
      setServiceRates({ ...serviceRates, [newService]: 40 });
    }
  };

  const handleUpdateTieredRule = (index: number, field: 'threshold' | 'rate', value: number) => {
    const updated = [...tieredRules];
    updated[index] = { ...updated[index], [field]: value };
    setTieredRules(updated);
  };

  const handleUpdateServiceRate = (service: string, rate: number) => {
    setServiceRates({ ...serviceRates, [service]: rate });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        shopId,
        rate_type: rateType,
        base_rate: baseRate,
        tiered_rules: rateType === 'tiered' ? tieredRules : undefined,
        service_rates: rateType === 'service_specific' ? serviceRates : undefined,
      };

      const response = await fetch('/api/commissions/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage('✓ Commission structure saved successfully');
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error saving commission structure: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6">Commission Structure</h2>

      <div className="space-y-6">
        {/* Rate Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commission Type
          </label>
          <div className="space-y-2">
            {['flat', 'tiered', 'service_specific'].map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="radio"
                  value={type}
                  checked={rateType === type}
                  onChange={(e) => setRateType(e.target.value as any)}
                  className="rounded"
                />
                <span className="ml-2 text-sm">
                  {type === 'flat' && 'Flat Rate (%)'}
                  {type === 'tiered' && 'Tiered by Monthly Revenue'}
                  {type === 'service_specific' && 'Service-Specific Rates'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Base Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base Commission Rate (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={baseRate}
            onChange={(e) => setBaseRate(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Tiered Rules */}
        {rateType === 'tiered' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Revenue Thresholds
              </label>
              <button
                onClick={handleAddTieredRule}
                className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                + Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {tieredRules.map((rule, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Revenue threshold"
                    value={rule.threshold}
                    onChange={(e) => handleUpdateTieredRule(idx, 'threshold', parseFloat(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Commission %"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rule.rate}
                    onChange={(e) => handleUpdateTieredRule(idx, 'rate', parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={() => handleRemoveTieredRule(idx)}
                    className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service-Specific Rates */}
        {rateType === 'service_specific' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Service Rates
            </label>
            <div className="space-y-2">
              {Object.entries(serviceRates).map(([service, rate]) => (
                <div key={service} className="flex gap-2 items-center">
                  <span className="flex-1 text-sm">{service}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rate}
                    onChange={(e) => handleUpdateServiceRate(service, parseFloat(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`p-3 rounded text-sm ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Commission Structure'}
        </button>
      </div>
    </div>
  );
}
