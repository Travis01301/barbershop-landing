'use client';

import React, { useState, useEffect } from 'react';

interface GoogleCalendarConnectorProps {
  organizationId: string;
  onConnected?: (email: string) => void;
  onDisconnected?: () => void;
}

export function GoogleCalendarConnector({
  organizationId,
  onConnected,
  onDisconnected,
}: GoogleCalendarConnectorProps) {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [organizationId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `/api/integrations/google/authorize?organizationId=${organizationId}`
      );
      const data = (await response.json()) as any;
      setConnected(data.connected);
      setEmail(data.email);
      setLastSyncedAt(data.lastSyncedAt);
    } catch (error) {
      console.error('Error fetching Google Calendar status:', error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Redirect to Google OAuth
      const state = Math.random().toString(36).substring(7);
      const params = new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        redirect_uri: `${window.location.origin}/integrations/google/callback`,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // TODO: Add disconnect endpoint
      setConnected(false);
      setEmail(null);
      onDisconnected?.();
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Google Calendar</h3>
          <p className="text-sm text-gray-600">Sync appointments to your Google Calendar</p>
        </div>
        <div className="text-right">
          {connected ? (
            <div>
              <p className="text-sm font-medium text-green-600">Connected</p>
              <p className="text-xs text-gray-500">{email}</p>
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
            {loading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}
