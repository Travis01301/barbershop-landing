import { query } from './db';
import { logger } from './logger';
import { retry } from './retry';

const calendarLogger = logger.createChild('google-calendar');

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
}

interface AppointmentEvent {
  id: number;
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private googleApiUrl = 'https://www.googleapis.com/calendar/v3';
  private googleOAuthUrl = 'https://oauth2.googleapis.com';

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      calendarLogger.warn('Google Calendar credentials not configured');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(shopId: string, state?: string): string {
    const scope = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      state: state || shopId,
    });

    return `${this.googleOAuthUrl}/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    try {
      calendarLogger.debug('Exchanging authorization code for token');

      const response = await fetch(`${this.googleOAuthUrl}/token`, {
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
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();
      calendarLogger.info('Token exchange successful');
      return data;
    } catch (error) {
      calendarLogger.error('Token exchange error', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`${this.googleOAuthUrl}/token`, {
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
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      calendarLogger.error('Token refresh error', error);
      throw error;
    }
  }

  /**
   * Connect Google account to a shop
   */
  async connectAccount(shopId: number, accessToken: string, refreshToken?: string): Promise<void> {
    try {
      calendarLogger.info('Connecting Google Calendar account', { shopId });

      // Verify token is valid by getting calendar list
      await this.fetchWithAuth(`${this.googleApiUrl}/users/me/calendarList`, accessToken);

      // Update shop with tokens
      await query(
        `UPDATE shops 
         SET google_calendar_access_token = $1,
             google_calendar_refresh_token = COALESCE($2, google_calendar_refresh_token),
             google_calendar_connected = true,
             google_calendar_connected_at = CURRENT_TIMESTAMP,
             google_calendar_sync_enabled = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [accessToken, refreshToken, shopId]
      );

      calendarLogger.info('Google Calendar connected', { shopId });
    } catch (error) {
      calendarLogger.error('Failed to connect Google Calendar', error);
      throw error;
    }
  }

  /**
   * Disconnect Google Calendar from a shop
   */
  async disconnectAccount(shopId: number): Promise<void> {
    try {
      calendarLogger.info('Disconnecting Google Calendar account', { shopId });

      await query(
        `UPDATE shops 
         SET google_calendar_access_token = NULL,
             google_calendar_refresh_token = NULL,
             google_calendar_connected = false,
             google_calendar_sync_enabled = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [shopId]
      );

      calendarLogger.info('Google Calendar disconnected', { shopId });
    } catch (error) {
      calendarLogger.error('Failed to disconnect Google Calendar', error);
      throw error;
    }
  }

  /**
   * Sync appointments to Google Calendar
   */
  async syncAppointmentsToCalendar(shopId: number): Promise<SyncResult> {
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      calendarLogger.info('Starting sync: appointments → Google Calendar', { shopId });

      // Get shop with Google Calendar tokens
      const shopResult = await query(
        `SELECT id, google_calendar_access_token, google_calendar_refresh_token 
         FROM shops WHERE id = $1 AND google_calendar_connected = true`,
        [shopId]
      );

      if (shopResult.rowCount === 0) {
        throw new Error('Shop not connected to Google Calendar');
      }

      const shop = shopResult.rows[0];
      let accessToken = shop.google_calendar_access_token;

      // Get recent appointments that need syncing
      const appointmentsResult = await query(
        `SELECT a.id, a.customer_name, a.customer_email, a.start_time, a.end_time, a.notes
         FROM appointments a
         WHERE a.shop_id = $1
           AND a.status = 'confirmed'
           AND a.start_time > NOW() - INTERVAL '24 hours'
           AND a.start_time <= NOW() + INTERVAL '30 days'
           AND NOT EXISTS (
             SELECT 1 FROM google_calendar_events 
             WHERE appointment_id = a.id
           )
         ORDER BY a.start_time DESC
         LIMIT 50`,
        [shopId]
      );

      // Get calendar list
      let calendarList;
      try {
        calendarList = await this.fetchWithAuth(
          `${this.googleApiUrl}/users/me/calendarList`,
          accessToken
        );
      } catch (error) {
        // Try refreshing token
        if (shop.google_calendar_refresh_token) {
          const refreshed = await this.refreshAccessToken(shop.google_calendar_refresh_token);
          accessToken = refreshed.access_token;
          await query(
            'UPDATE shops SET google_calendar_access_token = $1 WHERE id = $2',
            [accessToken, shopId]
          );
          calendarList = await this.fetchWithAuth(
            `${this.googleApiUrl}/users/me/calendarList`,
            accessToken
          );
        } else {
          throw error;
        }
      }

      const primaryCalendar = calendarList.items?.[0];
      if (!primaryCalendar) {
        throw new Error('No calendar found');
      }

      // Sync each appointment
      for (const appointment of appointmentsResult.rows) {
        try {
          const event = this.appointmentToGoogleEvent(appointment);

          const createResponse = await this.fetchWithAuth(
            `${this.googleApiUrl}/calendars/${primaryCalendar.id}/events`,
            accessToken,
            'POST',
            event
          );

          // Store mapping
          await query(
            `INSERT INTO google_calendar_events 
             (shop_id, appointment_id, google_event_id, google_calendar_id)
             VALUES ($1, $2, $3, $4)`,
            [shopId, appointment.id, createResponse.id, primaryCalendar.id]
          );

          itemsSynced++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          calendarLogger.warn('Failed to sync appointment', { appointmentId: appointment.id, error: errorMsg });
          errors.push(`Appointment ${appointment.id}: ${errorMsg}`);
        }
      }

      // Log sync result
      await query(
        `INSERT INTO google_calendar_sync_logs 
         (shop_id, sync_type, status, items_synced, completed_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [shopId, 'appointments_to_calendar', 'success', itemsSynced]
      );

      // Update last sync time
      await query(
        'UPDATE shops SET google_calendar_last_sync = CURRENT_TIMESTAMP WHERE id = $1',
        [shopId]
      );

      calendarLogger.info('Appointments synced to Google Calendar', { shopId, itemsSynced });

      return { success: true, itemsSynced, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      calendarLogger.error('Sync error', error);

      // Log failure
      await query(
        `INSERT INTO google_calendar_sync_logs 
         (shop_id, sync_type, status, error_message, completed_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [shopId, 'appointments_to_calendar', 'failed', errorMsg]
      );

      return { success: false, itemsSynced, errors: [errorMsg, ...errors] };
    }
  }

  /**
   * Sync Google Calendar events to appointments
   */
  async syncCalendarToAppointments(shopId: number): Promise<SyncResult> {
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      calendarLogger.info('Starting sync: Google Calendar → appointments', { shopId });

      // Get shop with Google Calendar tokens
      const shopResult = await query(
        `SELECT id, google_calendar_access_token, google_calendar_refresh_token 
         FROM shops WHERE id = $1 AND google_calendar_connected = true`,
        [shopId]
      );

      if (shopResult.rowCount === 0) {
        throw new Error('Shop not connected to Google Calendar');
      }

      const shop = shopResult.rows[0];
      let accessToken = shop.google_calendar_access_token;

      // Get calendar list
      let calendarList;
      try {
        calendarList = await this.fetchWithAuth(
          `${this.googleApiUrl}/users/me/calendarList`,
          accessToken
        );
      } catch (error) {
        // Try refreshing token
        if (shop.google_calendar_refresh_token) {
          const refreshed = await this.refreshAccessToken(shop.google_calendar_refresh_token);
          accessToken = refreshed.access_token;
          await query(
            'UPDATE shops SET google_calendar_access_token = $1 WHERE id = $2',
            [accessToken, shopId]
          );
          calendarList = await this.fetchWithAuth(
            `${this.googleApiUrl}/users/me/calendarList`,
            accessToken
          );
        } else {
          throw error;
        }
      }

      const primaryCalendar = calendarList.items?.[0];
      if (!primaryCalendar) {
        throw new Error('No calendar found');
      }

      // Get events from Google Calendar (past 7 days, future 30 days)
      const now = new Date();
      const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const eventsResponse = await this.fetchWithAuth(
        `${this.googleApiUrl}/calendars/${primaryCalendar.id}/events?timeMin=${timeMin}&timeMax=${timeMax}&q=blocked&orderBy=startTime&singleEvents=true`,
        accessToken
      );

      const events = eventsResponse.items || [];

      // Create appointments for "blocked" events (manually blocked time)
      for (const event of events) {
        try {
          // Check if already exists
          const existingResult = await query(
            'SELECT id FROM google_calendar_events WHERE shop_id = $1 AND google_event_id = $2',
            [shopId, event.id]
          );

          if (existingResult.rowCount > 0) {
            continue; // Already synced
          }

          // Only sync "blocked" events as appointments
          if (event.summary?.toLowerCase() === 'blocked' || event.summary?.toLowerCase().includes('unavailable')) {
            const appointment = await this.createBlockedTimeAppointment(shopId, event);
            if (appointment) {
              // Store mapping
              await query(
                `INSERT INTO google_calendar_events 
                 (shop_id, appointment_id, google_event_id, google_calendar_id)
                 VALUES ($1, $2, $3, $4)`,
                [shopId, appointment.id, event.id, primaryCalendar.id]
              );
              itemsSynced++;
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          calendarLogger.warn('Failed to sync Google event', { eventId: event.id, error: errorMsg });
          errors.push(`Event ${event.id}: ${errorMsg}`);
        }
      }

      // Log sync result
      await query(
        `INSERT INTO google_calendar_sync_logs 
         (shop_id, sync_type, status, items_synced, completed_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [shopId, 'calendar_to_appointments', 'success', itemsSynced]
      );

      // Update last sync time
      await query(
        'UPDATE shops SET google_calendar_last_sync = CURRENT_TIMESTAMP WHERE id = $1',
        [shopId]
      );

      calendarLogger.info('Google Calendar events synced to appointments', { shopId, itemsSynced });

      return { success: true, itemsSynced, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      calendarLogger.error('Sync error', error);

      // Log failure
      await query(
        `INSERT INTO google_calendar_sync_logs 
         (shop_id, sync_type, status, error_message, completed_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [shopId, 'calendar_to_appointments', 'failed', errorMsg]
      );

      return { success: false, itemsSynced, errors: [errorMsg, ...errors] };
    }
  }

  /**
   * Handle Google Calendar webhook
   */
  async handleCalendarWebhook(shopId: number, body: any): Promise<void> {
    try {
      calendarLogger.info('Received calendar webhook', { shopId });

      const resourceId = body?.id;
      const resourceState = body?.resourceState;

      if (resourceState === 'exists') {
        // Calendar was updated, trigger sync
        await this.syncCalendarToAppointments(shopId);
      }

      calendarLogger.debug('Webhook processed', { shopId, resourceId });
    } catch (error) {
      calendarLogger.error('Webhook processing error', error);
      // Don't throw - we still want to return success to Google
    }
  }

  /**
   * Convert appointment to Google Calendar event
   */
  private appointmentToGoogleEvent(appointment: AppointmentEvent): GoogleEvent {
    return {
      id: `apt-${appointment.id}`,
      summary: `Appointment with ${appointment.customer_name}`,
      description: appointment.notes || '',
      start: {
        dateTime: new Date(appointment.start_time).toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(appointment.end_time).toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: appointment.customer_email ? [{ email: appointment.customer_email }] : [],
    };
  }

  /**
   * Create blocked time appointment from Google event
   */
  private async createBlockedTimeAppointment(shopId: number, event: GoogleEvent): Promise<{ id: number }> {
    const result = await query(
      `INSERT INTO appointments 
       (shop_id, customer_name, customer_email, start_time, end_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        shopId,
        'Calendar Block',
        'blocked@calendar.local',
        event.start.dateTime,
        event.end.dateTime,
        'confirmed',
        `Blocked time from Google Calendar: ${event.summary}`,
      ]
    );

    return result.rows[0];
  }

  /**
   * Make authenticated request to Google API
   */
  private async fetchWithAuth(
    url: string,
    accessToken: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
      throw new Error('Google Calendar token expired');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get sync status for a shop
   */
  async getSyncStatus(shopId: number): Promise<{
    connected: boolean;
    syncEnabled: boolean;
    lastSync?: string;
    nextSync?: string;
  }> {
    const result = await query(
      `SELECT google_calendar_connected, google_calendar_sync_enabled, google_calendar_last_sync
       FROM shops WHERE id = $1`,
      [shopId]
    );

    if (result.rowCount === 0) {
      throw new Error('Shop not found');
    }

    const shop = result.rows[0];
    return {
      connected: shop.google_calendar_connected,
      syncEnabled: shop.google_calendar_sync_enabled,
      lastSync: shop.google_calendar_last_sync?.toISOString(),
    };
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
