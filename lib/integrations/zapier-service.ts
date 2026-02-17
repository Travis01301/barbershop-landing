import { BaseIntegration, OAuthConfig, TokenResponse } from './base-integration';

// Zapier API Documentation
// https://zapier.com/developer/public-api/docs

export interface ZapierTrigger {
  key: string;
  noun: string;
  display: {
    label: string;
    description: string;
  };
  operation: {
    type: string;
    perform: {
      url: string;
      method: string;
    };
  };
}

export interface ZapierAction {
  key: string;
  noun: string;
  display: {
    label: string;
    description: string;
  };
  operation: {
    inputFields: Array<{ key: string; label: string; type: string; required: boolean }>;
    perform: {
      url: string;
      method: string;
    };
  };
}

export class ZapierIntegration extends BaseIntegration {
  private baseUrl = 'https://platform.zapier.com/api/v1';
  private appointmentWebhookUrl = 'https://hooks.zapier.com/hooks/catch';
  private paymentWebhookUrl = 'https://hooks.zapier.com/hooks/catch';

  constructor(config: OAuthConfig) {
    super('Zapier', config);
  }

  getAuthUrl(state: string, scope: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope.join(' '),
      state,
    });
    return `https://zapier.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Zapier token exchange failed: ${response.statusText}`);
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
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Zapier token');
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
      const response = await fetch(`${this.baseUrl}/oauth/token/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Triggers for Zapier
  getTriggers(): ZapierTrigger[] {
    return [
      {
        key: 'appointment_created',
        noun: 'Appointment',
        display: {
          label: 'Appointment Created',
          description: 'Triggers when a new appointment is created',
        },
        operation: {
          type: 'polling',
          perform: {
            url: `${this.config.redirectUri}/triggers/appointment_created`,
            method: 'GET',
          },
        },
      },
      {
        key: 'appointment_cancelled',
        noun: 'Appointment',
        display: {
          label: 'Appointment Cancelled',
          description: 'Triggers when an appointment is cancelled',
        },
        operation: {
          type: 'polling',
          perform: {
            url: `${this.config.redirectUri}/triggers/appointment_cancelled`,
            method: 'GET',
          },
        },
      },
      {
        key: 'payment_completed',
        noun: 'Payment',
        display: {
          label: 'Payment Completed',
          description: 'Triggers when a payment is completed',
        },
        operation: {
          type: 'polling',
          perform: {
            url: `${this.config.redirectUri}/triggers/payment_completed`,
            method: 'GET',
          },
        },
      },
      {
        key: 'customer_created',
        noun: 'Customer',
        display: {
          label: 'Customer Created',
          description: 'Triggers when a new customer is created',
        },
        operation: {
          type: 'polling',
          perform: {
            url: `${this.config.redirectUri}/triggers/customer_created`,
            method: 'GET',
          },
        },
      },
    ];
  }

  // Actions for Zapier
  getActions(): ZapierAction[] {
    return [
      {
        key: 'create_appointment',
        noun: 'Appointment',
        display: {
          label: 'Create Appointment',
          description: 'Create a new appointment',
        },
        operation: {
          inputFields: [
            { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
            { key: 'barberId', label: 'Barber ID', type: 'string', required: true },
            { key: 'serviceId', label: 'Service ID', type: 'string', required: true },
            { key: 'appointmentDate', label: 'Date & Time', type: 'datetime', required: true },
            { key: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
            { key: 'notes', label: 'Notes', type: 'text', required: false },
          ],
          perform: {
            url: `${this.config.redirectUri}/actions/create_appointment`,
            method: 'POST',
          },
        },
      },
      {
        key: 'send_sms',
        noun: 'Message',
        display: {
          label: 'Send SMS',
          description: 'Send SMS to a customer',
        },
        operation: {
          inputFields: [
            { key: 'phoneNumber', label: 'Phone Number', type: 'string', required: true },
            { key: 'message', label: 'Message', type: 'text', required: true },
          ],
          perform: {
            url: `${this.config.redirectUri}/actions/send_sms`,
            method: 'POST',
          },
        },
      },
      {
        key: 'send_email',
        noun: 'Email',
        display: {
          label: 'Send Email',
          description: 'Send email to a customer',
        },
        operation: {
          inputFields: [
            { key: 'email', label: 'Email Address', type: 'string', required: true },
            { key: 'subject', label: 'Subject', type: 'string', required: true },
            { key: 'body', label: 'Body', type: 'text', required: true },
          ],
          perform: {
            url: `${this.config.redirectUri}/actions/send_email`,
            method: 'POST',
          },
        },
      },
      {
        key: 'create_customer',
        noun: 'Customer',
        display: {
          label: 'Create Customer',
          description: 'Create a new customer',
        },
        operation: {
          inputFields: [
            { key: 'name', label: 'Customer Name', type: 'string', required: true },
            { key: 'email', label: 'Email', type: 'string', required: false },
            { key: 'phone', label: 'Phone', type: 'string', required: false },
          ],
          perform: {
            url: `${this.config.redirectUri}/actions/create_customer`,
            method: 'POST',
          },
        },
      },
    ];
  }

  logError(message: string, error: any): void {
    console.error(`[Zapier Integration] ${message}`, error);
  }
}
