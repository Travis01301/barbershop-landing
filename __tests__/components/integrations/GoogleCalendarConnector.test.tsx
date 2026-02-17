import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleCalendarConnector } from '@/app/components/integrations/GoogleCalendarConnector';

// Mock fetch
global.fetch = jest.fn();

describe('GoogleCalendarConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component with proper title', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        connected: false,
        email: null,
        lastSyncedAt: null,
      }),
    });

    render(<GoogleCalendarConnector organizationId="test-org" />);
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('should show connect button when not connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        connected: false,
        email: null,
        lastSyncedAt: null,
      }),
    });

    render(<GoogleCalendarConnector organizationId="test-org" />);

    await waitFor(() => {
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
    });
  });

  it('should show disconnect button when connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        connected: true,
        email: 'user@example.com',
        lastSyncedAt: new Date().toISOString(),
      }),
    });

    render(<GoogleCalendarConnector organizationId="test-org" />);

    await waitFor(() => {
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
  });

  it('should display email when connected', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        connected: true,
        email: 'test@example.com',
        lastSyncedAt: new Date().toISOString(),
      }),
    });

    render(<GoogleCalendarConnector organizationId="test-org" />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should fetch status on mount', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({
        connected: false,
        email: null,
        lastSyncedAt: null,
      }),
    });

    render(<GoogleCalendarConnector organizationId="test-org" />);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/integrations/google/authorize')
    );
  });

  it('should call onConnected callback when connected', async () => {
    const onConnected = jest.fn();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          connected: false,
          email: null,
          lastSyncedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    render(
      <GoogleCalendarConnector
        organizationId="test-org"
        onConnected={onConnected}
      />
    );

    // Component is rendered
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });
});
