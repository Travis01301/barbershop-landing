import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Shop Provisioner Component
 * Add new shops to organization
 */
export default function ShopProvisioner({ orgId }) {
  const [shops, setShops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    capacity: 5,
  });

  useEffect(() => {
    fetchShops();
  }, [orgId]);

  const fetchShops = async () => {
    try {
      const response = await axios.get(`/api/organizations/${orgId}/shops`);
      setShops(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load shops');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.post(`/api/organizations/${orgId}/shops`, formData);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        capacity: 5,
      });
      setShowForm(false);
      fetchShops();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shopId) => {
    if (!window.confirm('Deactivate this shop? This cannot be undone.')) return;

    try {
      await axios.delete(`/api/organizations/${orgId}/shops/${shopId}`);
      fetchShops();
    } catch (err) {
      setError('Failed to delete shop');
    }
  };

  if (loading) {
    return <div className="loading">Loading shops...</div>;
  }

  return (
    <div className="shop-provisioner">
      <div className="provisioner-header">
        <h1>Manage Shops</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Shop'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="shop-form">
          <h2>Create New Shop</h2>
          
          <div className="form-group">
            <label htmlFor="name">Shop Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Downtown Location"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
              />
            </div>
            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                placeholder="ZIP code"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="shop@email.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="capacity">Barber Capacity</label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              max="50"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Creating...' : 'Create Shop'}
          </button>
        </form>
      )}

      <div className="shops-list">
        {shops.length === 0 ? (
          <div className="empty-state">
            <p>No shops yet</p>
            <p>Add your first shop to get started</p>
          </div>
        ) : (
          <div className="shops-grid">
            {shops.map(shop => (
              <div key={shop.id} className="shop-card">
                <div className="shop-card-header">
                  <h3>{shop.name}</h3>
                  {shop.isActive && <span className="badge badge-active">Active</span>}
                  {!shop.isActive && <span className="badge badge-inactive">Inactive</span>}
                </div>
                <div className="shop-card-content">
                  {shop.address && <p><strong>Address:</strong> {shop.address}</p>}
                  {shop.city && <p><strong>City:</strong> {shop.city}, {shop.state} {shop.zipCode}</p>}
                  {shop.phone && <p><strong>Phone:</strong> {shop.phone}</p>}
                  {shop.email && <p><strong>Email:</strong> {shop.email}</p>}
                  <p><strong>Capacity:</strong> {shop.capacity} barbers</p>
                </div>
                <div className="shop-card-actions">
                  <button 
                    onClick={() => handleDelete(shop.id)}
                    className="btn btn-danger btn-small"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .shop-provisioner {
          padding: 20px;
        }

        .provisioner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .provisioner-header h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }

        .shop-form {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #e0e0e0;
        }

        .shop-form h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }

        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .error-message {
          padding: 12px;
          background: #ffebee;
          color: #d32f2f;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 14px;
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

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-danger {
          background: #f44336;
          color: white;
        }

        .btn-small {
          padding: 8px 12px;
          font-size: 12px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .shops-list {
          margin-top: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .empty-state p:first-child {
          font-size: 18px;
          margin: 0 0 10px 0;
        }

        .shops-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .shop-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .shop-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .shop-card-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }

        .shop-card-header h3 {
          margin: 0;
          color: #333;
          font-size: 16px;
        }

        .badge {
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

        .shop-card-content {
          margin-bottom: 15px;
        }

        .shop-card-content p {
          margin: 8px 0;
          font-size: 14px;
          color: #666;
        }

        .shop-card-actions {
          display: flex;
          gap: 8px;
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
