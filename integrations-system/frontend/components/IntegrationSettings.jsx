// Integration Settings Component
import React, { useState, useEffect } from 'react';
import './IntegrationSettings.css';

export default function IntegrationSettings({ integrationId, provider }) {
  const [settings, setSettings] = useState({
    webhook_url: '',
    enabled_triggers: [],
    enabled_actions: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [integrationId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `/api/integrations/${integrationId}`,
        {
          headers: {
            'X-Business-ID': sessionStorage.getItem('businessId'),
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      const integration = data.integration;

      setSettings({
        webhook_url: integration.webhook_url || '',
        enabled_triggers: integration.enabled_triggers || [],
        enabled_actions: integration.enabled_actions || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/integrations/${integrationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Business-ID': sessionStorage.getItem('businessId'),
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerToggle = (trigger) => {
    setSettings(prev => ({
      ...prev,
      enabled_triggers: prev.enabled_triggers.includes(trigger)
        ? prev.enabled_triggers.filter(t => t !== trigger)
        : [...prev.enabled_triggers, trigger],
    }));
  };

  const handleActionToggle = (action) => {
    setSettings(prev => ({
      ...prev,
      enabled_actions: prev.enabled_actions.includes(action)
        ? prev.enabled_actions.filter(a => a !== action)
        : [...prev.enabled_actions, action],
    }));
  };

  if (loading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  const availableTriggers = getTriggersForProvider(provider);
  const availableActions = getActionsForProvider(provider);

  return (
    <div className="integration-settings">
      <div className="settings-header">
        <h2>{provider} Settings</h2>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}
      {success && <div className="success-message">✅ Settings saved successfully</div>}

      <div className="settings-section">
        <h3>Webhook Configuration</h3>
        <p className="section-description">
          Configure a webhook URL to receive real-time events from this integration
        </p>

        <div className="form-group">
          <label>Webhook URL</label>
          <input
            type="url"
            value={settings.webhook_url}
            onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
            placeholder="https://your-domain.com/webhooks/integrations"
            className="form-input"
          />
          <p className="help-text">
            Leave empty to disable webhooks. We'll POST events to this URL.
          </p>

          {settings.webhook_url && (
            <button
              className="btn btn-secondary"
              onClick={() => testWebhook(settings.webhook_url)}
            >
              🧪 Test Webhook
            </button>
          )}
        </div>
      </div>

      {availableTriggers.length > 0 && (
        <div className="settings-section">
          <h3>Triggers</h3>
          <p className="section-description">
            Choose which events should trigger webhooks
          </p>

          <div className="triggers-grid">
            {availableTriggers.map(trigger => (
              <div key={trigger.key} className="checkbox-item">
                <input
                  type="checkbox"
                  id={trigger.key}
                  checked={settings.enabled_triggers.includes(trigger.key)}
                  onChange={() => handleTriggerToggle(trigger.key)}
                />
                <label htmlFor={trigger.key}>
                  <span className="trigger-name">{trigger.name}</span>
                  <span className="trigger-description">{trigger.description}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableActions.length > 0 && (
        <div className="settings-section">
          <h3>Actions</h3>
          <p className="section-description">
            Choose which actions can be triggered via webhooks
          </p>

          <div className="actions-grid">
            {availableActions.map(action => (
              <div key={action.key} className="checkbox-item">
                <input
                  type="checkbox"
                  id={action.key}
                  checked={settings.enabled_actions.includes(action.key)}
                  onChange={() => handleActionToggle(action.key)}
                />
                <label htmlFor={action.key}>
                  <span className="action-name">{action.name}</span>
                  <span className="action-description">{action.description}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
        <button className="btn btn-secondary" onClick={loadSettings}>
          ↻ Reset
        </button>
      </div>
    </div>
  );
}

function getTriggersForProvider(provider) {
  const triggers = {
    google_calendar: [
      { key: 'event_created', name: 'Event Created', description: 'When a calendar event is created' },
      { key: 'event_updated', name: 'Event Updated', description: 'When a calendar event is modified' },
      { key: 'event_deleted', name: 'Event Deleted', description: 'When a calendar event is removed' },
    ],
    outlook_calendar: [
      { key: 'event_created', name: 'Event Created', description: 'When a calendar event is created' },
      { key: 'event_updated', name: 'Event Updated', description: 'When a calendar event is modified' },
      { key: 'event_deleted', name: 'Event Deleted', description: 'When a calendar event is removed' },
    ],
    shopify: [
      { key: 'order_created', name: 'Order Created', description: 'When a new order is placed' },
      { key: 'order_updated', name: 'Order Updated', description: 'When an order is modified' },
      { key: 'product_updated', name: 'Product Updated', description: 'When a product is modified' },
    ],
    zapier: [
      { key: 'appointment_created', name: 'Appointment Created', description: 'When a new appointment is created' },
      { key: 'payment_completed', name: 'Payment Completed', description: 'When a payment is received' },
      { key: 'customer_created', name: 'Customer Created', description: 'When a new customer is added' },
    ],
  };

  return triggers[provider] || [];
}

function getActionsForProvider(provider) {
  const actions = {
    zapier: [
      { key: 'create_appointment', name: 'Create Appointment', description: 'Create a new appointment' },
      { key: 'send_sms', name: 'Send SMS', description: 'Send an SMS message' },
      { key: 'send_email', name: 'Send Email', description: 'Send an email' },
      { key: 'create_customer', name: 'Create Customer', description: 'Add a new customer' },
    ],
  };

  return actions[provider] || [];
}

async function testWebhook(webhookUrl) {
  try {
    const response = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhook_url: webhookUrl }),
    });

    if (response.ok) {
      alert('✅ Webhook test successful');
    } else {
      alert('❌ Webhook test failed');
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
