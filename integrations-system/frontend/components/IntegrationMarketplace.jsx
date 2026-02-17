// Integration Marketplace Component
import React, { useState, useEffect } from 'react';
import './IntegrationMarketplace.css';

const AVAILABLE_INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync appointments to Google Calendar with bi-directional sync',
    icon: '📅',
    status: 'available',
    features: [
      'Auto-sync appointments to Google Calendar',
      'Sync cancellations',
      'Bi-directional sync of availability',
      'Real-time updates',
    ],
  },
  {
    id: 'outlook_calendar',
    name: 'Outlook Calendar',
    description: 'Integrate with Outlook & Office 365 Calendar',
    icon: '📧',
    status: 'available',
    features: [
      'Connect to Office 365',
      'Auto-sync appointments',
      'Bi-directional availability sync',
      'Calendar subscriptions',
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify POS',
    description: 'Track product sales and revenue per barber',
    icon: '🛍️',
    status: 'available',
    features: [
      'Sync product sales with appointments',
      'Revenue tracking per barber',
      'Bundle offers (appointment + products)',
      'Inventory sync',
    ],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5000+ apps (Slack, Discord, Twilio, etc.)',
    icon: '⚡',
    status: 'available',
    features: [
      'Appointment notifications to Slack/Discord',
      'SMS via Twilio',
      'Email integrations',
      'Custom webhooks',
    ],
  },
];

export default function IntegrationMarketplace({ onSelect }) {
  const [integrations, setIntegrations] = useState(AVAILABLE_INTEGRATIONS);
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div className="integration-marketplace">
      <div className="marketplace-header">
        <h1>Integration Marketplace</h1>
        <p>Connect your barbershop to powerful tools and services</p>
      </div>

      <div className="marketplace-filters">
        <button
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          All Integrations
        </button>
        <button
          className={selectedCategory === 'calendar' ? 'active' : ''}
          onClick={() => setSelectedCategory('calendar')}
        >
          Calendar
        </button>
        <button
          className={selectedCategory === 'payments' ? 'active' : ''}
          onClick={() => setSelectedCategory('payments')}
        >
          Payments
        </button>
        <button
          className={selectedCategory === 'communication' ? 'active' : ''}
          onClick={() => setSelectedCategory('communication')}
        >
          Communication
        </button>
      </div>

      <div className="integrations-grid">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ integration, onSelect }) {
  return (
    <div className="integration-card">
      <div className="card-icon">{integration.icon}</div>
      <h3>{integration.name}</h3>
      <p className="card-description">{integration.description}</p>

      <div className="card-features">
        <h4>Features:</h4>
        <ul>
          {integration.features.map((feature, idx) => (
            <li key={idx}>✓ {feature}</li>
          ))}
        </ul>
      </div>

      <button
        className="connect-button"
        onClick={() => onSelect(integration.id)}
      >
        Connect {integration.name}
      </button>

      <div className="card-status">
        <span className={`status-badge ${integration.status}`}>
          {integration.status}
        </span>
      </div>
    </div>
  );
}
