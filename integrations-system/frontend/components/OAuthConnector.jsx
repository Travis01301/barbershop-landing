// OAuth Connector Component
import React, { useState } from 'react';
import './OAuthConnector.css';

export default function OAuthConnector({ provider, integrationId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get authorization URL
      const authResponse = await fetch(
        `/api/oauth/authorize/${provider}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Business-ID': sessionStorage.getItem('businessId'),
          },
          body: JSON.stringify({
            redirect_uri: `${window.location.origin}/oauth/callback`,
          }),
        }
      );

      if (!authResponse.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const data = await authResponse.json();

      // Step 2: Redirect to provider's OAuth page
      const popup = window.open(
        data.auth_url,
        `${provider}-oauth`,
        'width=500,height=600'
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Step 3: Listen for callback
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'oauth-callback') {
          const { code, state } = event.data;

          // Step 4: Exchange code for token
          const callbackResponse = await fetch(
            `/api/oauth/callback/${provider}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code,
                state,
                integration_id: integrationId,
              }),
            }
          );

          if (!callbackResponse.ok) {
            throw new Error('Failed to complete OAuth flow');
          }

          window.removeEventListener('message', handleMessage);
          popup.close();

          onSuccess({
            provider,
            integrationId,
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup on timeout
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 300000); // 5 minutes timeout
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="oauth-connector">
      <div className="connector-header">
        <h2>Connect {provider}</h2>
        <p>Grant permission to sync data between your barbershop and {provider}</p>
      </div>

      <div className="connector-info">
        <h3>What permissions we request:</h3>
        <ul className="permissions-list">
          {getPermissionsForProvider(provider).map((permission, idx) => (
            <li key={idx}>
              <span className="permission-icon">✓</span>
              {permission}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <button
        className="oauth-button"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? 'Connecting...' : `Connect with ${provider}`}
      </button>

      <div className="connector-footer">
        <p className="security-note">
          🔒 Your credentials are secure. We use industry-standard OAuth 2.0.
        </p>
      </div>
    </div>
  );
}

function getPermissionsForProvider(provider) {
  const permissions = {
    google_calendar: [
      'Read and write access to your Google Calendar',
      'View event details',
      'Create and modify events',
      'Access your email address',
    ],
    outlook_calendar: [
      'Read and write access to Outlook Calendar',
      'Manage calendar events',
      'Access your Office 365 account',
      'View your email address',
    ],
    shopify: [
      'Read and write product information',
      'Access order history',
      'View inventory levels',
      'Track sales data',
    ],
    zapier: [
      'Create zaps (automation workflows)',
      'Access integration data',
      'Manage webhooks',
      'Trigger actions in connected apps',
    ],
  };

  return permissions[provider] || [];
}
