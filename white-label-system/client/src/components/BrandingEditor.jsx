import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Branding Editor Component
 * Edit logo, colors, fonts, domain, and email settings
 */
export default function BrandingEditor({ orgId }) {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    appName: '',
    primaryColor: '#0066CC',
    secondaryColor: '#FF6B35',
    accentColor: '#FFC300',
    fontFamily: 'Inter',
    customDomain: '',
    emailDomain: '',
    supportEmail: '',
    welcomeMessage: '',
    helpText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [orgId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/api/organizations/${orgId}/settings`);
      setSettings(response.data);
      setFormData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logo) return;

    setSaving(true);
    const formDataForUpload = new FormData();
    formDataForUpload.append('logo', logo);

    try {
      await axios.post(`/api/organizations/${orgId}/settings/logo`, formDataForUpload);
      setSuccess(true);
      setLogo(null);
      fetchSettings();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await axios.patch(`/api/organizations/${orgId}/settings`, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="branding-editor">
      <div className="editor-header">
        <h1>Branding & Settings</h1>
        <p>Customize how your platform looks and feels</p>
      </div>

      <form onSubmit={handleSubmit} className="editor-form">
        {/* Logo Section */}
        <section className="editor-section">
          <h2>Logo</h2>
          {settings?.logoUrl && (
            <div className="logo-preview">
              <img src={settings.logoUrl} alt="Current Logo" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="logo">Upload Logo</label>
            <input
              type="file"
              id="logo"
              accept="image/jpeg,image/png,image/svg+xml"
              onChange={handleLogoChange}
            />
            {logo && (
              <button 
                type="button" 
                onClick={handleLogoUpload}
                disabled={saving}
              >
                {saving ? 'Uploading...' : 'Upload Logo'}
              </button>
            )}
          </div>
        </section>

        {/* App Name */}
        <section className="editor-section">
          <h2>App Name</h2>
          <div className="form-group">
            <label htmlFor="appName">Application Name</label>
            <input
              type="text"
              id="appName"
              name="appName"
              value={formData.appName}
              onChange={handleChange}
              placeholder="e.g., Acme Barbershop"
            />
          </div>
        </section>

        {/* Brand Colors */}
        <section className="editor-section">
          <h2>Brand Colors</h2>
          <div className="color-grid">
            <div className="color-group">
              <label htmlFor="primaryColor">Primary Color</label>
              <div className="color-input">
                <input
                  type="color"
                  id="primaryColor"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange({ target: { name: 'primaryColor', value: e.target.value } })}
                  placeholder="#0066CC"
                />
              </div>
            </div>

            <div className="color-group">
              <label htmlFor="secondaryColor">Secondary Color</label>
              <div className="color-input">
                <input
                  type="color"
                  id="secondaryColor"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => handleChange({ target: { name: 'secondaryColor', value: e.target.value } })}
                  placeholder="#FF6B35"
                />
              </div>
            </div>

            <div className="color-group">
              <label htmlFor="accentColor">Accent Color</label>
              <div className="color-input">
                <input
                  type="color"
                  id="accentColor"
                  name="accentColor"
                  value={formData.accentColor}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) => handleChange({ target: { name: 'accentColor', value: e.target.value } })}
                  placeholder="#FFC300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Font */}
        <section className="editor-section">
          <h2>Font</h2>
          <div className="form-group">
            <label htmlFor="fontFamily">Font Family</label>
            <select
              id="fontFamily"
              name="fontFamily"
              value={formData.fontFamily}
              onChange={handleChange}
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
            </select>
          </div>
        </section>

        {/* Domain & Email */}
        <section className="editor-section">
          <h2>Domain & Email</h2>
          <div className="form-group">
            <label htmlFor="customDomain">Custom Domain</label>
            <input
              type="text"
              id="customDomain"
              name="customDomain"
              value={formData.customDomain}
              onChange={handleChange}
              placeholder="e.g., mybarbershop.com"
            />
            <small>Configure CNAME to point to barbershop.com</small>
          </div>

          <div className="form-group">
            <label htmlFor="emailDomain">Email Domain</label>
            <input
              type="text"
              id="emailDomain"
              name="emailDomain"
              value={formData.emailDomain}
              onChange={handleChange}
              placeholder="e.g., barbershop.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="supportEmail">Support Email</label>
            <input
              type="email"
              id="supportEmail"
              name="supportEmail"
              value={formData.supportEmail}
              onChange={handleChange}
              placeholder="support@mybarbershop.com"
            />
          </div>
        </section>

        {/* Messages */}
        <section className="editor-section">
          <h2>Welcome & Help</h2>
          <div className="form-group">
            <label htmlFor="welcomeMessage">Welcome Message</label>
            <textarea
              id="welcomeMessage"
              name="welcomeMessage"
              value={formData.welcomeMessage}
              onChange={handleChange}
              placeholder="Welcome message shown to users"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="helpText">Help Text</label>
            <textarea
              id="helpText"
              name="helpText"
              value={formData.helpText}
              onChange={handleChange}
              placeholder="Help text shown in support"
              rows="3"
            />
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Settings saved successfully!</div>}

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <style jsx>{`
        .branding-editor {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .editor-header {
          margin-bottom: 30px;
        }

        .editor-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #333;
        }

        .editor-header p {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .editor-form {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .editor-section {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .editor-section h2 {
          margin: 0 0 15px 0;
          font-size: 18px;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
          font-size: 14px;
        }

        input[type="text"],
        input[type="email"],
        select,
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
        }

        input[type="text"]:focus,
        input[type="email"]:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        small {
          display: block;
          margin-top: 4px;
          color: #999;
          font-size: 12px;
        }

        .logo-preview {
          margin-bottom: 15px;
          text-align: center;
        }

        .logo-preview img {
          max-width: 150px;
          max-height: 150px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        input[type="file"] {
          padding: 10px;
          border: 2px dashed #ddd;
          border-radius: 6px;
          cursor: pointer;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .color-group {
          display: flex;
          flex-direction: column;
        }

        .color-input {
          display: flex;
          gap: 8px;
        }

        input[type="color"] {
          width: 50px;
          height: 40px;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          padding: 2px;
        }

        input[type="color"] + input {
          flex: 1;
        }

        .error-message {
          padding: 12px;
          background: #ffebee;
          color: #d32f2f;
          border-radius: 6px;
          font-size: 14px;
        }

        .success-message {
          padding: 12px;
          background: #e8f5e9;
          color: #388e3c;
          border-radius: 6px;
          font-size: 14px;
        }

        .btn {
          padding: 12px 24px;
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

        .loading {
          padding: 40px;
          text-align: center;
          color: #666;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
