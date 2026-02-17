import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Organization Billing Component
 * Manage billing, plans, and invoices
 */
export default function OrgBilling({ orgId }) {
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: 99,
      features: ['Up to 5 shops', 'Basic analytics', 'Email support'],
    },
    {
      id: 'PROFESSIONAL',
      name: 'Professional',
      price: 299,
      features: ['Up to 20 shops', 'Advanced analytics', 'Priority support', 'Custom domain'],
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 999,
      features: ['Unlimited shops', 'Custom analytics', '24/7 support', 'Custom domain', 'API access'],
    },
  ];

  useEffect(() => {
    fetchBilling();
  }, [orgId]);

  const fetchBilling = async () => {
    try {
      const [billingRes, invoicesRes] = await Promise.all([
        axios.get(`/api/organizations/${orgId}/billing`),
        axios.get(`/api/organizations/${orgId}/billing/invoices`),
      ]);
      setBilling(billingRes.data);
      setInvoices(invoicesRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load billing information');
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (plan) => {
    try {
      await axios.patch(`/api/organizations/${orgId}/billing`, {
        plan: plan.id,
        monthlyCharge: plan.price,
      });
      setShowPlanSelector(false);
      fetchBilling();
    } catch (err) {
      setError('Failed to upgrade plan');
    }
  };

  if (loading) {
    return <div className="loading">Loading billing information...</div>;
  }

  return (
    <div className="org-billing">
      <div className="billing-header">
        <h1>Billing & Plans</h1>
        <p>Manage your subscription and billing details</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Current Plan */}
      <section className="billing-section">
        <h2>Current Plan</h2>
        {billing && (
          <div className="current-plan-card">
            <div className="plan-info">
              <h3>{billing.plan}</h3>
              <p className="price">${billing.monthlyCharge}/month</p>
              <p className="status">
                {billing.isActive ? (
                  <span className="badge badge-active">Active</span>
                ) : (
                  <span className="badge badge-inactive">Inactive</span>
                )}
              </p>
            </div>
            <div className="plan-dates">
              <div className="date-item">
                <label>Billing Email</label>
                <p>{billing.billingEmail}</p>
              </div>
              <div className="date-item">
                <label>Next Billing Date</label>
                <p>{new Date(billing.nextBillingDate).toLocaleDateString()}</p>
              </div>
              {billing.lastBilledAt && (
                <div className="date-item">
                  <label>Last Billed</label>
                  <p>{new Date(billing.lastBilledDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowPlanSelector(!showPlanSelector)}
              className="btn btn-secondary"
            >
              {showPlanSelector ? 'Cancel' : 'Change Plan'}
            </button>
          </div>
        )}
      </section>

      {/* Plan Selection */}
      {showPlanSelector && (
        <section className="billing-section">
          <h2>Select a Plan</h2>
          <div className="plans-grid">
            {plans.map(plan => (
              <div key={plan.id} className="plan-card">
                <h3>{plan.name}</h3>
                <div className="plan-price">${plan.price}/month</div>
                <ul className="plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleUpgradePlan(plan)}
                  className={`btn ${plan.id === billing?.plan ? 'btn-disabled' : 'btn-primary'}`}
                  disabled={plan.id === billing?.plan}
                >
                  {plan.id === billing?.plan ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment Method */}
      <section className="billing-section">
        <h2>Payment Method</h2>
        {billing?.stripeCustomerId ? (
          <div className="payment-info">
            <p className="success-text">✓ Payment method on file</p>
            <button className="btn btn-secondary">Update Payment Method</button>
          </div>
        ) : (
          <div className="payment-info">
            <p className="warning-text">No payment method on file</p>
            <button className="btn btn-primary">Add Payment Method</button>
          </div>
        )}
      </section>

      {/* Invoices */}
      <section className="billing-section">
        <h2>Invoices</h2>
        {invoices.length === 0 ? (
          <p className="empty-text">No invoices yet</p>
        ) : (
          <div className="invoices-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                    <td>${invoice.amount.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td>
                      <a href={`#`} className="link">Download</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .org-billing {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .billing-header {
          margin-bottom: 30px;
        }

        .billing-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #333;
        }

        .billing-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .billing-section {
          background: white;
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .billing-section h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #333;
        }

        .current-plan-card {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 20px;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          color: white;
        }

        .plan-info h3 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .price {
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-active {
          background: #e8f5e9;
          color: #388e3c;
        }

        .badge-inactive {
          background: #ffebee;
          color: #d32f2f;
        }

        .badge-paid {
          background: #e8f5e9;
          color: #388e3c;
        }

        .badge-pending {
          background: #fff3e0;
          color: #f57c00;
        }

        .badge-failed {
          background: #ffebee;
          color: #d32f2f;
        }

        .plan-dates {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .date-item label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .date-item p {
          margin: 0;
          font-size: 14px;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .plan-card {
          background: #f9f9f9;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .plan-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .plan-card h3 {
          margin: 0 0 10px 0;
          font-size: 20px;
          color: #333;
        }

        .plan-price {
          font-size: 28px;
          font-weight: 700;
          color: #667eea;
          margin: 10px 0;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 20px 0;
          text-align: left;
        }

        .plan-features li {
          padding: 8px 0;
          color: #666;
          font-size: 14px;
          border-bottom: 1px solid #e0e0e0;
        }

        .plan-features li:last-child {
          border-bottom: none;
        }

        .payment-info {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .success-text {
          color: #388e3c;
          margin-bottom: 15px;
          font-weight: 500;
        }

        .warning-text {
          color: #f57c00;
          margin-bottom: 15px;
          font-weight: 500;
        }

        .invoices-table {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f5f5f5;
        }

        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #ddd;
          font-size: 14px;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 14px;
          color: #666;
        }

        .link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .link:hover {
          text-decoration: underline;
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
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

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .btn-disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          padding: 12px;
          background: #ffebee;
          color: #d32f2f;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .empty-text {
          color: #999;
          text-align: center;
          padding: 20px;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #666;
        }
      `}</style>
    </div>
  );
}
