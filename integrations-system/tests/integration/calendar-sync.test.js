// Calendar Sync Integration Tests
const CalendarSyncService = require('../../backend/services/calendar/CalendarSyncService');
const { pool } = require('../../backend/server');
const OAuthManager = require('../../backend/services/oauth/OAuthManager');

describe('Calendar Sync Service', () => {
  let syncService;
  let oauthManager;
  let testIntegrationId;

  beforeAll(async () => {
    oauthManager = new OAuthManager(pool, process.env.ENCRYPTION_KEY || 'test-key');
    syncService = new CalendarSyncService(pool, oauthManager);

    // Create test integration
    const result = await pool.query(
      `INSERT INTO integrations (business_id, provider, config, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      ['test-business', 'google_calendar', JSON.stringify({ calendar_id: 'primary' })]
    );
    testIntegrationId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM integrations WHERE id = $1', [testIntegrationId]);
    await pool.end();
  });

  describe('Appointment to Calendar Event Conversion', () => {
    it('should convert appointment to calendar event', () => {
      const appointment = {
        id: 'appt-123',
        service_name: 'Haircut',
        customer_name: 'John Doe',
        barber_name: 'Bob',
        start_time: '2024-01-15T10:00:00',
        end_time: '2024-01-15T10:30:00',
        location: '123 Main St',
        status: 'confirmed',
      };

      const event = syncService.appointmentToCalendarEvent(appointment);

      expect(event.summary).toContain('Haircut');
      expect(event.summary).toContain('John Doe');
      expect(event.start.dateTime).toBe('2024-01-15T10:00:00');
      expect(event.end.dateTime).toBe('2024-01-15T10:30:00');
      expect(event.location).toBe('123 Main St');
    });

    it('should handle cancelled appointments', () => {
      const appointment = {
        id: 'appt-123',
        service_name: 'Beard Trim',
        customer_name: 'Jane Doe',
        barber_name: 'Alice',
        start_time: '2024-01-16T14:00:00',
        end_time: '2024-01-16T14:15:00',
        status: 'cancelled',
      };

      const event = syncService.appointmentToCalendarEvent(appointment);

      expect(event.status).toBe('cancelled');
    });
  });

  describe('Sync Tracking', () => {
    it('should create tracking record for synced appointment', async () => {
      const appointmentId = 'appt-track-001';
      const trackingData = {
        provider_event_id: 'google-event-123',
        provider_calendar_id: 'primary',
        sync_direction: 'local_to_remote',
        local_hash: 'hash123',
        remote_hash: 'hash456',
      };

      await syncService.updateTrackingRecord(testIntegrationId, appointmentId, trackingData);

      const tracking = await syncService.getTrackingRecord(testIntegrationId, appointmentId);
      expect(tracking).toBeDefined();
      expect(tracking.provider_event_id).toBe('google-event-123');
    });

    it('should detect changes via hashes', async () => {
      const appointmentId = 'appt-hash-001';
      const oldData = { title: 'Haircut', time: '10:00' };
      const newData = { title: 'Haircut', time: '10:30' };

      const oldHash = syncService.hashObject(oldData);
      const newHash = syncService.hashObject(newData);

      expect(oldHash).not.toBe(newHash);
    });
  });

  describe('Sync Logging', () => {
    it('should log sync events', async () => {
      await syncService.logSync(testIntegrationId, 'sync', 'test_action', 'success', {
        test: 'data',
      });

      const result = await pool.query(
        `SELECT * FROM integration_logs 
         WHERE integration_id = $1 AND action = 'test_action'
         LIMIT 1`,
        [testIntegrationId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].status).toBe('success');
    });

    it('should log sync failures with error message', async () => {
      const errorMessage = 'Calendar API error: Permission denied';

      await syncService.logSync(testIntegrationId, 'sync', 'failed_sync', 'failed', {}, errorMessage);

      const result = await pool.query(
        `SELECT * FROM integration_logs 
         WHERE integration_id = $1 AND action = 'failed_sync'
         LIMIT 1`,
        [testIntegrationId]
      );

      expect(result.rows[0].error_message).toBe(errorMessage);
    });
  });
});
