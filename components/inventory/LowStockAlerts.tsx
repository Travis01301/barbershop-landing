'use client';

import React, { useState, useEffect } from 'react';
import { InventoryAlert } from '@/lib/inventory-service';

interface LowStockAlertsProps {
  shopId: number;
}

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({ shopId }) => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    // Refresh every minute
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [shopId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inventory/alerts?shop_id=${shopId}&acknowledged=false`
      );
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alert_id: number) => {
    try {
      const response = await fetch('/api/inventory/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id }),
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');

      setAlerts(alerts.filter((a) => a.id !== alert_id));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded">
        <p className="text-green-700">✓ All inventory levels are healthy!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold mb-4 text-red-600">
        ⚠ {alerts.length} Stock Alert{alerts.length > 1 ? 's' : ''}
      </h3>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded border-l-4 ${
              alert.alert_type === 'out_of_stock'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-400'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold">
                  {alert.alert_type === 'out_of_stock' ? 'OUT OF STOCK' : 'LOW STOCK'}
                </p>
                <p className="text-sm text-gray-600">
                  Item #{alert.item_id}: {alert.current_quantity} remaining (threshold: {alert.threshold})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 ml-4"
              >
                Acknowledge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
