// Outlook Calendar Adapter (Microsoft Graph API)
const axios = require('axios');

class OutlookCalendarAdapter {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://graph.microsoft.com/v1.0/me/calendars';
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create event in Outlook Calendar
   */
  async createEvent(event) {
    const response = await axios.post(`${this.baseUrl}/primary/events`, 
      {
        subject: event.summary,
        bodyPreview: event.description,
        body: {
          contentType: 'HTML',
          content: event.description,
        },
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone || 'UTC',
        },
        location: event.location ? { displayName: event.location } : undefined,
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
      },
      { headers: this.headers }
    );

    return {
      id: response.data.id,
      webLink: response.data.webLink,
    };
  }

  /**
   * Update event in Outlook Calendar
   */
  async updateEvent(calendarId, eventId, event) {
    const response = await axios.patch(
      `${this.baseUrl}/${calendarId || 'primary'}/events/${eventId}`,
      {
        subject: event.summary,
        body: {
          contentType: 'HTML',
          content: event.description,
        },
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone || 'UTC',
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone || 'UTC',
        },
        location: event.location ? { displayName: event.location } : undefined,
      },
      { headers: this.headers }
    );

    return {
      id: response.data.id,
      webLink: response.data.webLink,
    };
  }

  /**
   * Delete event from Outlook Calendar
   */
  async deleteEvent(calendarId, eventId) {
    await axios.delete(
      `${this.baseUrl}/${calendarId || 'primary'}/events/${eventId}`,
      { headers: this.headers }
    );

    return { success: true };
  }

  /**
   * Get events from Outlook Calendar
   */
  async getEvents(timeMin = null, timeMax = null) {
    const now = new Date();
    const startTime = timeMin || now.toISOString();
    const endTime = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await axios.get(
      `${this.baseUrl}/primary/calendarview?startDateTime=${startTime}&endDateTime=${endTime}&$top=100`,
      { headers: this.headers }
    );

    return response.data.value || [];
  }

  /**
   * Get calendar metadata
   */
  async getCalendarInfo(calendarId = 'primary') {
    const response = await axios.get(
      `${this.baseUrl}/${calendarId}`,
      { headers: this.headers }
    );

    return {
      id: response.data.id,
      name: response.data.name,
      changeKey: response.data.changeKey,
      owner: response.data.owner,
    };
  }

  /**
   * Subscribe to calendar changes
   */
  async subscribeToChanges(webhookUrl) {
    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/subscriptions',
      {
        changeType: 'created,updated,deleted',
        notificationUrl: webhookUrl,
        resource: '/me/calendars/primary/events',
        expirationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        clientState: Math.random().toString(36).substring(7),
      },
      { headers: this.headers }
    );

    return {
      id: response.data.id,
      expirationDateTime: response.data.expirationDateTime,
    };
  }

  /**
   * Unsubscribe from calendar changes
   */
  async unsubscribeFromChanges(subscriptionId) {
    await axios.delete(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      { headers: this.headers }
    );

    return { success: true };
  }
}

module.exports = OutlookCalendarAdapter;
