import { BaseIntegration, OAuthConfig, TokenResponse } from './base-integration';

// Microsoft Graph API Documentation
// https://docs.microsoft.com/en-us/graph/api/event-post-events

export interface OutlookEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ emailAddress: { address: string; name: string }; status: { response: string } }>;
  organizer?: { emailAddress: { address: string; name: string } };
  categories?: string[];
}

export interface OutlookEventSyncOptions {
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

export class OutlookCalendarIntegration extends BaseIntegration {
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  private scopes = [
    'Calendars.ReadWrite',
    'User.Read',
  ];

  constructor(config: OAuthConfig) {
    super('Outlook Calendar', config);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.scopes.map(s => `https://graph.microsoft.com/${s}`).join(' '),
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
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
          scope: this.scopes.map(s => `https://graph.microsoft.com/${s}`).join(' '),
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Outlook token exchange failed: ${response.statusText}`);
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
          scope: this.scopes.map(s => `https://graph.microsoft.com/${s}`).join(' '),
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Outlook token');
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
      const response = await fetch(`${this.baseUrl}/me/mailboxSettings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async createEvent(
    accessToken: string,
    options: OutlookEventSyncOptions
  ): Promise<OutlookEvent> {
    const event = {
      subject: `${options.serviceName} - ${options.customerId}`,
      body: {
        contentType: 'HTML',
        content: `<p>Barber: ${options.barberId}</p><p>Phone: ${
          options.customerPhone || 'N/A'
        }</p>${options.notes ? `<p>Notes: ${options.notes}</p>` : ''}`,
      },
      start: {
        dateTime: options.startTime.toISOString().split('.')[0],
        timeZone: 'Eastern Standard Time',
      },
      end: {
        dateTime: options.endTime.toISOString().split('.')[0],
        timeZone: 'Eastern Standard Time',
      },
      attendees: [
        {
          emailAddress: {
            address: options.customerEmail,
            name: options.customerId,
          },
          type: 'required',
        },
      ],
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
    };

    try {
      const response = await fetch(`${this.baseUrl}/me/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to create Outlook event: ${response.statusText}`);
      }

      return (await response.json()) as OutlookEvent;
    } catch (error) {
      this.logError('Failed to create Outlook event', error);
      throw error;
    }
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/me/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete Outlook event: ${response.statusText}`);
      }
    } catch (error) {
      this.logError('Failed to delete Outlook event', error);
      throw error;
    }
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    options: OutlookEventSyncOptions
  ): Promise<OutlookEvent> {
    const event = {
      subject: `${options.serviceName} - ${options.customerId}`,
      body: {
        contentType: 'HTML',
        content: `<p>Barber: ${options.barberId}</p>${
          options.notes ? `<p>Notes: ${options.notes}</p>` : ''
        }`,
      },
      start: {
        dateTime: options.startTime.toISOString().split('.')[0],
        timeZone: 'Eastern Standard Time',
      },
      end: {
        dateTime: options.endTime.toISOString().split('.')[0],
        timeZone: 'Eastern Standard Time',
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/me/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Failed to update Outlook event: ${response.statusText}`);
      }

      return (await response.json()) as OutlookEvent;
    } catch (error) {
      this.logError('Failed to update Outlook event', error);
      throw error;
    }
  }

  async listUpcomingEvents(accessToken: string, maxResults: number = 10): Promise<OutlookEvent[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/calendarview?startDateTime=${new Date().toISOString()}&endDateTime=${
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }&$top=${maxResults}&$orderby=start/dateTime`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list Outlook events: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.value || [];
    } catch (error) {
      this.logError('Failed to list Outlook events', error);
      throw error;
    }
  }

  logError(message: string, error: any): void {
    console.error(`[Outlook Calendar Integration] ${message}`, error);
  }
}
