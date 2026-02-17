import { BaseIntegration, OAuthConfig, TokenResponse } from './base-integration';

// Google Calendar API Documentation
// https://developers.google.com/calendar/api

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus: string }>;
  organizer?: { email: string; displayName?: string };
}

export interface GoogleCalendarSyncOptions {
  appointmentId: string;
  customerId: string;
  barberId: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export class GoogleCalendarIntegration extends BaseIntegration {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
  private tokenUrl = 'https://oauth2.googleapis.com/token';
  private scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  constructor(config: OAuthConfig) {
    super('Google Calendar', config);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Google token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      };
    } catch (error) {
      this.logError('Failed to exchange code for token', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Google token');
      }

      const data = await response.json() as any;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      };
    } catch (error) {
      this.logError('Failed to refresh token', error);
      throw error;
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/primary?access_token=${accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async createEvent(
    accessToken: string,
    options: GoogleCalendarSyncOptions
  ): Promise<GoogleCalendarEvent> {
    const event = {
      summary: `${options.serviceName} - ${options.customerId}`,
      description: `Barber: ${options.barberId}\nPhone: ${options.customerPhone || 'N/A'}\n${
        options.notes ? `Notes: ${options.notes}` : ''
      }`,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: options.endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [
        {
          email: options.customerEmail,
          displayName: options.customerId,
          responseStatus: 'needsAction',
        },
      ],
    };

    try {
      const response = await fetch(`${this.baseUrl}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to create Google Calendar event: ${response.statusText}`);
      }

      return (await response.json()) as GoogleCalendarEvent;
    } catch (error) {
      this.logError('Failed to create Google Calendar event', error);
      throw error;
    }
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete Google Calendar event: ${response.statusText}`);
      }
    } catch (error) {
      this.logError('Failed to delete Google Calendar event', error);
      throw error;
    }
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    options: GoogleCalendarSyncOptions
  ): Promise<GoogleCalendarEvent> {
    const event = {
      summary: `${options.serviceName} - ${options.customerId}`,
      description: `Barber: ${options.barberId}\n${options.notes ? `Notes: ${options.notes}` : ''}`,
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: options.endTime.toISOString(),
        timeZone: 'America/New_York',
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to update Google Calendar event: ${response.statusText}`);
      }

      return (await response.json()) as GoogleCalendarEvent;
    } catch (error) {
      this.logError('Failed to update Google Calendar event', error);
      throw error;
    }
  }

  async listUpcomingEvents(
    accessToken: string,
    maxResults: number = 10
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list Google Calendar events: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.items || [];
    } catch (error) {
      this.logError('Failed to list Google Calendar events', error);
      throw error;
    }
  }

  logError(message: string, error: any): void {
    console.error(`[Google Calendar Integration] ${message}`, error);
  }
}
