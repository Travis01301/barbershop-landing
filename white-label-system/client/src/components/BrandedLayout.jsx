import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Branded Layout Component
 * Applies org branding dynamically to the layout
 * Loads settings based on org or custom domain
 */
export default function BrandedLayout({ children, orgId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrandingSettings();
  }, [orgId]);

  const fetchBrandingSettings = async () => {
    try {
      // Try to get from org ID first
      if (orgId) {
        const response = await axios.get(`/api/organizations/${orgId}/settings`);
        setSettings(response.data);
      } else {
        // Try to get from current domain
        const response = await axios.get('/api/organizations/*/settings/public');
        setSettings(response.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load branding settings:', err);
      setLoading(false);
    }
  };

  const getThemeStyles = () => {
    if (!settings) return '';

    return `
      :root {
        --primary-color: ${settings.primaryColor || '#0066CC'};
        --secondary-color: ${settings.secondaryColor || '#FF6B35'};
        --accent-color: ${settings.accentColor || '#FFC300'};
        --font-family: ${settings.fontFamily || 'Inter'}, sans-serif;
      }

      * {
        font-family: var(--font-family);
      }

      a {
        color: var(--primary-color);
      }

      button, .btn {
        background-color: var(--primary-color);
      }

      button:hover, .btn:hover {
        background-color: var(--secondary-color);
      }
    `;
  };

  if (loading && !settings) {
    return (
      <div className="branded-layout">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="branded-layout" style={settings ? {
      '--primary-color': settings.primaryColor,
      '--secondary-color': settings.secondaryColor,
      '--accent-color': settings.accentColor,
      '--font-family': settings.fontFamily,
    } : {}}>
      <style>{getThemeStyles()}</style>

      <header className="branded-header">
        <nav className="branded-nav">
          <div className="nav-brand">
            {settings?.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt={settings.appName} 
                className="logo"
              />
            )}
            <span className="app-name">{settings?.appName || 'BarberFlow'}</span>
          </div>
          <div className="nav-menu">
            <a href="/dashboard">Dashboard</a>
            <a href="/settings">Settings</a>
            <a href="/billing">Billing</a>
            <a href="/profile">Profile</a>
          </div>
        </nav>
      </header>

      <main className="branded-content">
        {settings?.welcomeMessage && (
          <div className="welcome-banner">
            <p>{settings.welcomeMessage}</p>
          </div>
        )}
        {children}
      </main>

      <footer className="branded-footer">
        <p>&copy; {new Date().getFullYear()} {settings?.appName || 'BarberFlow'}. All rights reserved.</p>
        {settings?.supportEmail && (
          <p><a href={`mailto:${settings.supportEmail}`}>Support: {settings.supportEmail}</a></p>
        )}
      </footer>

      <style jsx>{`
        .branded-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
        }

        .branded-header {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .branded-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 30px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-color);
        }

        .logo {
          height: 40px;
          width: auto;
        }

        .app-name {
          color: var(--primary-color);
        }

        .nav-menu {
          display: flex;
          gap: 25px;
        }

        .nav-menu a {
          color: #666;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: color 0.3s ease;
        }

        .nav-menu a:hover {
          color: var(--primary-color);
        }

        .branded-content {
          flex: 1;
          padding: 30px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .welcome-banner {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }

        .welcome-banner p {
          margin: 0;
          font-size: 16px;
        }

        .branded-footer {
          background: white;
          border-top: 1px solid #e0e0e0;
          padding: 20px 30px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .branded-footer p {
          margin: 8px 0;
        }

        .branded-footer a {
          color: var(--primary-color);
          text-decoration: none;
        }

        .branded-footer a:hover {
          text-decoration: underline;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #666;
          font-size: 16px;
        }

        @media (max-width: 768px) {
          .branded-nav {
            flex-direction: column;
            gap: 15px;
          }

          .nav-menu {
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
          }

          .branded-content {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
}
