// Google Calendar Adapter
const { google } = require('googleapis');

class GoogleCalendarAdapter {
  constructor(accessToken) {
    this.calendar = google.calendar({
      version: 'v3',
      auth: accessToken,
    });
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(event) {
    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        status: event.status,
        reminders: {
          useDefault: true,
        },
      },
    });

    return {
      id: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(calendarId, eventId, event) {
    const response = await this.calendar.events.update({
      calendarId: calendarId || 'primary',
      eventId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        status: event.status,
      },
    });

    return {
      id: response.data.id,
      htmlLink: response.data.htmlLink,
    };
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(calendarId, eventId) {
    await this.calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId,
    });

    return { success: true };
  }

  /**
   * Get events from Google Calendar
   */
  async getEvents(timeMin = null, timeMax = null) {
    const now = new Date();
    
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || now.toISOString(),
      timeMax: timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return response.data.items || [];
  }

  /**
   * Get calendar metadata
   */
  async getCalendarInfo() {
    const response = await this.calendar.calendars.get({
      calendarId: 'primary',
    });

    return {
      id: response.data.id,
      summary: response.data.summary,
      description: response.data.description,
      timezone: response.data.timeZone,
    };
  }

  /**
   * Watch for changes
   */
  async watchCalendar(webhookUrl) {
    const response = await this.calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: `${Date.now()}-barbershop-sync`,
        type: 'web_hook',
        address: webhookUrl,
      },
    });

    return {
      id: response.data.id,
      resourceId: response.data.resourceId,
      resourceUri: response.data.resourceUri,
      expiration: response.data.expiration,
    };
  }

  /**
   * Stop watching calendar
   */
  async stopWatch(channelId, resourceId) {
    await this.calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });

    return { success: true };
  }
}

module.exports = GoogleCalendarAdapter;
