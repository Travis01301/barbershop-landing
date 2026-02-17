import React, { useState } from 'react';
import axios from 'axios';

/**
 * Organization Setup Component
 * Creates a new organization
 */
export default function OrgSetup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'SINGLE_SHOP',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post('/api/organizations', formData);
      setSuccess(true);
      console.log('Organization created:', response.data);
      
      // Redirect to dashboard or branding setup
      window.location.href = `/organizations/${response.data.id}/setup`;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="org-setup">
      <div className="setup-container">
        <h1>Create Your Organization</h1>
        <p>Get started with BarberFlow in minutes</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Organization Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Acme Barbershop Group"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@acmebarbershop.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">Organization Type *</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="SINGLE_SHOP">Single Shop</option>
              <option value="AGENCY">Agency</option>
              <option value="CHAIN">Chain</option>
              <option value="FRANCHISE">Franchise Partner</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Organization created successfully!</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ol>
            <li>Customize your branding</li>
            <li>Add shops (if applicable)</li>
            <li>Invite team members</li>
            <li>Configure billing</li>
          </ol>
        </div>
      </div>

      <style jsx>{`
        .org-setup {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .setup-container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        h1 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 28px;
        }

        p {
          color: #666;
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }

        input, select {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .error-message {
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .success-message {
          color: #388e3c;
          padding: 12px;
          background: #e8f5e9;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .info-box {
          margin-top: 30px;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .info-box h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
        }

        .info-box ol {
          margin: 0;
          padding-left: 20px;
          color: #666;
          font-size: 14px;
        }

        .info-box li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
