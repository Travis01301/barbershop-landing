import { ZapierIntegration } from '@/lib/integrations/zapier-service';

describe('ZapierIntegration', () => {
  let zapier: ZapierIntegration;

  beforeEach(() => {
    zapier = new ZapierIntegration({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
    });
  });

  describe('getAuthUrl', () => {
    it('should generate valid authorization URL', () => {
      const state = 'test-state';
      const scopes = ['integration:read', 'integration:write'];
      const url = zapier.getAuthUrl(state, scopes);

      expect(url).toContain('https://zapier.com/oauth/authorize');
      expect(url).toContain(`client_id=test-client-id`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('integration:read');
    });
  });

  describe('getTriggers', () => {
    it('should return 4 triggers', () => {
      const triggers = zapier.getTriggers();
      expect(triggers).toHaveLength(4);
      expect(triggers.map((t) => t.key)).toEqual([
        'appointment_created',
        'appointment_cancelled',
        'payment_completed',
        'customer_created',
      ]);
    });

    it('should have proper trigger structure', () => {
      const triggers = zapier.getTriggers();
      triggers.forEach((trigger) => {
        expect(trigger.noun).toBeDefined();
        expect(trigger.display.label).toBeDefined();
        expect(trigger.display.description).toBeDefined();
        expect(trigger.operation.type).toBeDefined();
      });
    });
  });

  describe('getActions', () => {
    it('should return 4 actions', () => {
      const actions = zapier.getActions();
      expect(actions).toHaveLength(4);
      expect(actions.map((a) => a.key)).toEqual([
        'create_appointment',
        'send_sms',
        'send_email',
        'create_customer',
      ]);
    });

    it('should have proper action structure', () => {
      const actions = zapier.getActions();
      actions.forEach((action) => {
        expect(action.noun).toBeDefined();
        expect(action.display.label).toBeDefined();
        expect(action.operation.inputFields).toBeDefined();
        expect(Array.isArray(action.operation.inputFields)).toBe(true);
      });
    });

    it('create_appointment action should have correct input fields', () => {
      const actions = zapier.getActions();
      const createAppointment = actions.find((a) => a.key === 'create_appointment');
      expect(createAppointment?.operation.inputFields).toContainEqual(
        expect.objectContaining({
          key: 'customerId',
          required: true,
        })
      );
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should handle token exchange errors gracefully', async () => {
      const invalidCode = 'invalid-code';
      await expect(zapier.exchangeCodeForToken(invalidCode)).rejects.toThrow();
    });
  });
});
