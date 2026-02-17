import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Organization Dashboard
 * Manage shops, staff, billing, and analytics
 */
export default function OrgDashboard({ orgId }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
  }, [orgId]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`/api/organizations/${orgId}/dashboard`);
      setDashboard(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="org-dashboard">
      <header className="dashboard-header">
        <h1>{dashboard?.organization?.name}</h1>
        <p className="subtitle">{dashboard?.organization?.type} Organization</p>
      </header>

      <nav className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button 
          className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Billing
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{dashboard?.shops || 0}</div>
                <div className="stat-label">Active Shops</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{dashboard?.staff || 0}</div>
                <div className="stat-label">Team Members</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">${dashboard?.analytics?.totalRevenue?.toFixed(2) || '0.00'}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{dashboard?.analytics?.totalAppointments || 0}</div>
                <div className="stat-label">Total Appointments</div>
              </div>
            </div>

            <div className="info-sections">
              <section className="info-section">
                <h2>Organization Details</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Email</label>
                    <p>{dashboard?.organization?.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <p>{dashboard?.organization?.phone || 'Not set'}</p>
                  </div>
                  <div className="info-item">
                    <label>Type</label>
                    <p>{dashboard?.organization?.type}</p>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <p>{new Date(dashboard?.organization?.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </section>

              {dashboard?.billing && (
                <section className="info-section">
                  <h2>Billing Status</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Plan</label>
                      <p>{dashboard?.billing?.plan}</p>
                    </div>
                    <div className="info-item">
                      <label>Monthly Charge</label>
                      <p>${dashboard?.billing?.monthlyCharge?.toFixed(2)}</p>
                    </div>
                    <div className="info-item">
                      <label>Status</label>
                      <p className={dashboard?.billing?.isActive ? 'text-success' : 'text-danger'}>
                        {dashboard?.billing?.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="info-item">
                      <label>Next Billing</label>
                      <p>{new Date(dashboard?.billing?.nextBillingDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Organization Settings</h2>
            <p>Use the Settings tab to customize your branding, domain, and more.</p>
            <a href={`/organizations/${orgId}/settings`} className="btn btn-primary">
              Go to Settings
            </a>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="billing-section">
            <h2>Billing</h2>
            <p>Manage your billing details and view invoices.</p>
            <a href={`/organizations/${orgId}/billing`} className="btn btn-primary">
              Go to Billing
            </a>
          </div>
        )}
      </main>

      <style jsx>{`
        .org-dashboard {
          background: #f5f5f5;
          min-height: 100vh;
          padding: 20px;
        }

        .dashboard-header {
          background: white;
          padding: 30px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .dashboard-header h1 {
          margin: 0 0 10px 0;
          font-size: 32px;
          color: #333;
        }

        .subtitle {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .dashboard-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .tab {
          padding: 10px 20px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .tab:hover {
          color: #333;
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .dashboard-content {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .info-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .info-section {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .info-section h2 {
          margin: 0 0 15px 0;
          font-size: 18px;
          color: #333;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .info-item label {
          display: block;
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .info-item p {
          margin: 0;
          color: #333;
          font-size: 14px;
        }

        .text-success {
          color: #388e3c;
        }

        .text-danger {
          color: #d32f2f;
        }

        .settings-section,
        .billing-section {
          text-align: center;
          padding: 40px;
        }

        .settings-section h2,
        .billing-section h2 {
          margin-bottom: 15px;
          color: #333;
        }

        .settings-section p,
        .billing-section p {
          color: #666;
          margin-bottom: 20px;
        }

        .btn {
          display: inline-block;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .loading,
        .error-message {
          padding: 40px;
          text-align: center;
          font-size: 16px;
        }

        .error-message {
          color: #d32f2f;
          background: #ffebee;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
