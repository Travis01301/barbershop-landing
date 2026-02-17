// Integration Status Component
import React, { useState, useEffect } from 'react';
import './IntegrationStatus.css';

export default function IntegrationStatus({ integrationId }) {
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIntegration();
    const interval = setInterval(loadIntegration, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [integrationId]);

  const loadIntegration = async () => {
    try {
      const response = await fetch(
        `/api/integrations/${integrationId}`,
        {
          headers: {
            'X-Business-ID': sessionStorage.getItem('businessId'),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load integration');
      }

      setIntegration(await response.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="status-loading">Loading integration status...</div>;
  }

  if (error || !integration) {
    return <div className="status-error">Error: {error}</div>;
  }

  const { integration: data } = integration;

  return (
    <div className="integration-status">
      <div className="status-header">
        <h2>{data.provider}</h2>
        <StatusBadge status={data.status} />
      </div>

      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">Status:</span>
          <span className="status-value">{data.status}</span>
        </div>

        <div className="status-item">
          <span className="status-label">Last Sync:</span>
          <span className="status-value">
            {data.last_sync ? new Date(data.last_sync).toLocaleString() : 'Never'}
          </span>
        </div>

        <div className="status-item">
          <span className="status-label">Sync Status:</span>
          <SyncStatusIndicator status={data.sync_status} />
        </div>

        <div className="status-item">
          <span className="status-label">Connected:</span>
          <span className="status-value">
            {data.status === 'active' ? '✅ Yes' : '❌ No'}
          </span>
        </div>
      </div>

      {data.enabled_triggers && data.enabled_triggers.length > 0 && (
        <div className="status-section">
          <h3>Enabled Triggers</h3>
          <div className="triggers-list">
            {data.enabled_triggers.map(trigger => (
              <span key={trigger} className="trigger-badge">{trigger}</span>
            ))}
          </div>
        </div>
      )}

      {data.enabled_actions && data.enabled_actions.length > 0 && (
        <div className="status-section">
          <h3>Enabled Actions</h3>
          <div className="actions-list">
            {data.enabled_actions.map(action => (
              <span key={action} className="action-badge">{action}</span>
            ))}
          </div>
        </div>
      )}

      <div className="status-actions">
        <button
          className="btn btn-primary"
          onClick={() => triggerSync(integrationId, data.provider)}
        >
          🔄 Sync Now
        </button>
        <button className="btn btn-secondary">⚙️ Settings</button>
        <button className="btn btn-danger">🔴 Disconnect</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    active: { color: 'green', label: 'Active' },
    inactive: { color: 'gray', label: 'Inactive' },
    error: { color: 'red', label: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <span className={`status-badge status-${config.color}`}>
      {config.label}
    </span>
  );
}

function SyncStatusIndicator({ status }) {
  const statusConfig = {
    pending: { icon: '⏳', label: 'Pending' },
    syncing: { icon: '🔄', label: 'Syncing' },
    success: { icon: '✅', label: 'Success' },
    error: { icon: '❌', label: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`sync-indicator sync-${status}`}>
      {config.icon} {config.label}
    </span>
  );
}

async function triggerSync(integrationId, provider) {
  try {
    const response = await fetch(
      `/api/sync/${integrationId}/trigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          action: 'full_sync',
        }),
      }
    );

    if (response.ok) {
      alert('Sync triggered successfully');
    } else {
      alert('Failed to trigger sync');
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
