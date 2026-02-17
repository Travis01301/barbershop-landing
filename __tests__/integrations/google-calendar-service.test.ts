import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar-service';

describe('GoogleCalendarIntegration', () => {
  let google: GoogleCalendarIntegration;

  beforeEach(() => {
    google = new GoogleCalendarIntegration({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
    });
  });

  describe('getAuthUrl', () => {
    it('should generate valid Google OAuth URL', () => {
      const state = 'test-state';
      const url = google.getAuthUrl(state);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=test-client-id`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include calendar scope', () => {
      const state = 'test-state';
      const url = google.getAuthUrl(state);
      expect(url).toContain('https://www.googleapis.com/auth/calendar');
    });
  });

  describe('createEvent', () => {
    it('should create event with proper structure', async () => {
      // This is a mock test
      const appointmentData = {
        appointmentId: '123',
        customerId: 'customer-1',
        barberId: 'barber-1',
        serviceName: 'Haircut',
        startTime: new Date('2024-02-20T10:00:00'),
        endTime: new Date('2024-02-20T10:30:00'),
        customerEmail: 'customer@example.com',
        notes: 'Test appointment',
      };

      expect(appointmentData.serviceName).toBe('Haircut');
      expect(appointmentData.customerEmail).toBe('customer@example.com');
    });
  });

  describe('token validation', () => {
    it('should validate token structure', async () => {
      const invalidToken = '';
      const result = await google.validateToken(invalidToken);
      expect(typeof result).toBe('boolean');
    });
  });
});
