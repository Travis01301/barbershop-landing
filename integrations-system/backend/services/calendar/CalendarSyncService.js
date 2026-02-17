// Calendar Sync Service - Handles bi-directional calendar syncing
const axios = require('axios');
const crypto = require('crypto');

class CalendarSyncService {
  constructor(pool, oauthManager) {
    this.pool = pool;
    this.oauthManager = oauthManager;
    this.providers = {
      google_calendar: require('./GoogleCalendarAdapter'),
      outlook_calendar: require('./OutlookCalendarAdapter'),
    };
  }

  /**
   * Sync local appointment to provider calendar
   */
  async syncAppointmentToProvider(integrationId, provider, appointment) {
    const accessToken = await this.oauthManager.getValidAccessToken(
      integrationId,
      provider
    );

    const adapter = new this.providers[provider](accessToken);
    const event = this.appointmentToCalendarEvent(appointment);

    try {
      // Check if event already exists
      const tracking = await this.getTrackingRecord(integrationId, appointment.id);

      let providerEventId;
      if (tracking && tracking.provider_event_id) {
        // Update existing event
        providerEventId = tracking.provider_event_id;
        await adapter.updateEvent(tracking.provider_calendar_id, providerEventId, event);
      } else {
        // Create new event
        const result = await adapter.createEvent(event);
        providerEventId = result.id;
      }

      // Update tracking record
      await this.updateTrackingRecord(integrationId, appointment.id, {
        provider_event_id: providerEventId,
        sync_direction: 'local_to_remote',
        local_hash: this.hashObject(appointment),
        remote_hash: this.hashObject(event),
      });

      // Log sync
      await this.logSync(integrationId, 'sync', 'appointment_to_provider', 'success', {
        appointment_id: appointment.id,
        provider_event_id: providerEventId,
      });

      return {
        success: true,
        provider_event_id: providerEventId,
      };
    } catch (error) {
      console.error('Error syncing appointment to provider:', error);

      await this.logSync(integrationId, 'sync', 'appointment_to_provider', 'failed', 
        { appointment_id: appointment.id },
        error.message
      );

      throw error;
    }
  }

  /**
   * Remove appointment from provider calendar
   */
  async removeAppointmentFromProvider(integrationId, provider, appointmentId) {
    const accessToken = await this.oauthManager.getValidAccessToken(
      integrationId,
      provider
    );

    const adapter = new this.providers[provider](accessToken);
    const tracking = await this.getTrackingRecord(integrationId, appointmentId);

    if (!tracking || !tracking.provider_event_id) {
      return { success: true }; // No sync record, nothing to remove
    }

    try {
      await adapter.deleteEvent(tracking.provider_calendar_id, tracking.provider_event_id);

      // Remove tracking record
      await this.pool.query(
        `DELETE FROM calendar_sync_tracking WHERE integration_id = $1 AND local_appointment_id = $2`,
        [integrationId, appointmentId]
      );

      await this.logSync(integrationId, 'sync', 'appointment_removal', 'success', {
        appointment_id: appointmentId,
        provider_event_id: tracking.provider_event_id,
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing appointment from provider:', error);

      await this.logSync(integrationId, 'sync', 'appointment_removal', 'failed',
        { appointment_id: appointmentId },
        error.message
      );

      throw error;
    }
  }

  /**
   * Sync provider calendar events to local availability
   */
  async syncProviderCalendarToAvailability(integrationId, provider, barberId) {
    const accessToken = await this.oauthManager.getValidAccessToken(
      integrationId,
      provider
    );

    const adapter = new this.providers[provider](accessToken);

    try {
      // Get events from provider
      const events = await adapter.getEvents();

      // Store as barber unavailability blocks
      for (const event of events) {
        await this.createUnavailabilityBlock(barberId, {
          title: event.summary,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          source: 'calendar_sync',
          provider_event_id: event.id,
        });
      }

      await this.logSync(integrationId, 'sync', 'provider_to_availability', 'success', {
        barber_id: barberId,
        event_count: events.length,
      });

      return { success: true, synced_events: events.length };
    } catch (error) {
      console.error('Error syncing provider calendar:', error);

      await this.logSync(integrationId, 'sync', 'provider_to_availability', 'failed',
        { barber_id: barberId },
        error.message
      );

      throw error;
    }
  }

  /**
   * Helper: Convert appointment to calendar event
   */
  appointmentToCalendarEvent(appointment) {
    return {
      summary: `${appointment.service_name} - ${appointment.customer_name}`,
      description: `Barber: ${appointment.barber_name}\nCustomer: ${appointment.customer_name}`,
      start: {
        dateTime: appointment.start_time,
        timeZone: appointment.timezone || 'UTC',
      },
      end: {
        dateTime: appointment.end_time,
        timeZone: appointment.timezone || 'UTC',
      },
      location: appointment.location || '',
      status: appointment.status === 'cancelled' ? 'cancelled' : 'confirmed',
    };
  }

  /**
   * Helper: Get tracking record
   */
  async getTrackingRecord(integrationId, appointmentId) {
    const result = await this.pool.query(
      `SELECT * FROM calendar_sync_tracking 
       WHERE integration_id = $1 AND local_appointment_id = $2`,
      [integrationId, appointmentId]
    );
    return result.rows[0];
  }

  /**
   * Helper: Update or insert tracking record
   */
  async updateTrackingRecord(integrationId, appointmentId, data) {
    await this.pool.query(
      `INSERT INTO calendar_sync_tracking 
       (integration_id, local_appointment_id, provider_event_id, provider_calendar_id, 
        sync_direction, local_hash, remote_hash, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (integration_id, local_appointment_id) DO UPDATE SET
       provider_event_id = $3, local_hash = $6, remote_hash = $7, last_synced_at = NOW()`,
      [
        integrationId,
        appointmentId,
        data.provider_event_id,
        data.provider_calendar_id || null,
        data.sync_direction,
        data.local_hash,
        data.remote_hash,
      ]
    );
  }

  /**
   * Helper: Log sync event
   */
  async logSync(integrationId, eventType, action, status, data, errorMessage = null) {
    await this.pool.query(
      `INSERT INTO integration_logs 
       (integration_id, event_type, action, status, request_data, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [integrationId, eventType, action, status, JSON.stringify(data), errorMessage]
    );
  }

  /**
   * Helper: Create unavailability block
   */
  async createUnavailabilityBlock(barberId, data) {
    // This would integrate with your barber unavailability system
    // Example: INSERT INTO barber_unavailability (...) VALUES (...)
    console.log('Create unavailability block:', { barberId, ...data });
  }

  /**
   * Helper: Hash object for change detection
   */
  hashObject(obj) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(obj))
      .digest('hex');
  }
}

module.exports = CalendarSyncService;
