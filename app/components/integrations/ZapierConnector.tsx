'use client';

import React, { useState, useEffect } from 'react';

interface ZapierConnectorProps {
  organizationId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function ZapierConnector({
  organizationId,
  onConnected,
  onDisconnected,
}: ZapierConnectorProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [organizationId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `/api/integrations/zapier/authorize?organizationId=${organizationId}`
      );
      const data = (await response.json()) as any;
      setConnected(data.connected);
      setExternalId(data.externalId);
      setLastSyncedAt(data.lastSyncedAt);
    } catch (error) {
      console.error('Error fetching Zapier status:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const state = Math.random().toString(36).substring(7);
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_ZAPIER_CLIENT_ID || '',
        redirect_uri: `${window.location.origin}/integrations/zapier/callback`,
        response_type: 'code',
        scope: 'integration:read integration:write',
        state,
      });
      window.location.href = `https://zapier.com/oauth/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error connecting to Zapier:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // TODO: Add disconnect endpoint
      setConnected(false);
      setExternalId(null);
      onDisconnected?.();
    } catch (error) {
      console.error('Error disconnecting from Zapier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Zapier Integration</h3>
          <p className="text-sm text-gray-600">
            Automate workflows with Zapier (4 triggers, 4 actions)
          </p>
        </div>
        <div className="text-right">
          {connected ? (
            <p className="text-sm font-medium text-green-600">Connected</p>
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
        <p className="font-medium mb-2">Available Triggers:</p>
        <ul className="list-disc list-inside text-xs mb-3">
          <li>Appointment Created</li>
          <li>Appointment Cancelled</li>
          <li>Payment Completed</li>
          <li>Customer Created</li>
        </ul>

        <p className="font-medium mb-2">Available Actions:</p>
        <ul className="list-disc list-inside text-xs">
          <li>Create Appointment</li>
          <li>Send SMS</li>
          <li>Send Email</li>
          <li>Create Customer</li>
        </ul>
      </div>

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
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Zapier'}
          </button>
        )}
      </div>
    </div>
  );
}
