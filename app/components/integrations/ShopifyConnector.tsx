'use client';

import React, { useState, useEffect } from 'react';

interface ShopifyConnectorProps {
  organizationId: string;
  onConnected?: (shop: string) => void;
  onDisconnected?: () => void;
}

export function ShopifyConnector({
  organizationId,
  onConnected,
  onDisconnected,
}: ShopifyConnectorProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [shopInput, setShopInput] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [organizationId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `/api/integrations/shopify/authorize?organizationId=${organizationId}`
      );
      const data = (await response.json()) as any;
      setConnected(data.connected);
      setShop(data.shop);
      setLastSyncedAt(data.lastSyncedAt);
    } catch (error) {
      console.error('Error fetching Shopify status:', error);
    }
  };

  const handleConnect = async () => {
    if (!shopInput.trim()) {
      alert('Please enter your Shopify store name');
      return;
    }

    setLoading(true);
    try {
      const storeName = shopInput.includes('.myshopify.com')
        ? shopInput
        : `${shopInput}.myshopify.com`;

      const state = Math.random().toString(36).substring(7);
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID || '',
        scope: 'write_products,read_orders,write_orders',
        redirect_uri: `${window.location.origin}/integrations/shopify/callback`,
        state,
      });

      window.location.href = `https://${storeName}/admin/oauth/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // TODO: Add disconnect endpoint
      setConnected(false);
      setShop(null);
      onDisconnected?.();
    } catch (error) {
      console.error('Error disconnecting from Shopify:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Shopify POS</h3>
          <p className="text-sm text-gray-600">
            Sync product sales and create bundle offers
          </p>
        </div>
        <div className="text-right">
          {connected ? (
            <div>
              <p className="text-sm font-medium text-green-600">Connected</p>
              <p className="text-xs text-gray-500">{shop}</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-600">Not connected</p>
          )}
        </div>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-gray-500 mb-4">
          Last synced: {new Date(lastSyncedAt).toLocaleDateString()}
        </p>
      )}

      <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
        <p className="font-medium mb-2">Features:</p>
        <ul className="list-disc list-inside text-xs">
          <li>Sync product sales to appointments</li>
          <li>Track revenue per barber</li>
          <li>Create appointment + discount bundles</li>
          <li>Auto-sync order webhooks</li>
        </ul>
      </div>

      {!connected ? (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Shopify Store Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="mystore (or mystore.myshopify.com)"
              value={shopInput}
              onChange={(e) => setShopInput(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading || !shopInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Shopify'}
          </button>
        )}
      </div>
    </div>
  );
}
