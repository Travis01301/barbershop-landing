// Zapier Integration Service
const axios = require('axios');

class ZapierService {
  constructor(pool, oauthManager, webhookService) {
    this.pool = pool;
    this.oauthManager = oauthManager;
    this.webhookService = webhookService;
  }

  /**
   * Get Zapier app info
   */
  async getZapierAppInfo() {
    return {
      version: '1.0.0',
      platformVersion: '3',
      displayOrder: 0,
      notice: null,
      categories: ['productivity', 'communication'],
      description: 'Connect your barbershop to 5000+ apps via Zapier',
      image: process.env.ZAPIER_APP_ICON_URL,
      isHidden: false,
      standardRedirectUriPath: '/oauth/callback',
      helpText: 'Zapier integration for barbershop appointment management',
    };
  }

  /**
   * Define Zapier triggers
   */
  getTriggers() {
    return [
      {
        key: 'appointment_created',
        noun: 'Appointment',
        display: {
          label: 'New Appointment',
          description: 'Triggers when a new appointment is created',
          hidden: false,
          important: true,
        },
        operation: {
          type: 'hook',
          url: '/api/webhooks/zapier/appointment_created',
          performList: {
            url: '/api/zapier/triggers/appointment_created/list',
            sample: {
              id: 'appt-123',
              customer_id: 'cust-123',
              customer_name: 'John Doe',
              service: 'Haircut',
              barber_id: 'barber-123',
              barber_name: 'Bob',
              start_time: '2024-01-15T10:00:00Z',
              end_time: '2024-01-15T10:30:00Z',
              status: 'confirmed',
              created_at: '2024-01-14T15:30:00Z',
            },
          },
        },
      },
      {
        key: 'appointment_cancelled',
        noun: 'Appointment',
        display: {
          label: 'Appointment Cancelled',
          description: 'Triggers when an appointment is cancelled',
          hidden: false,
        },
        operation: {
          type: 'hook',
          url: '/api/webhooks/zapier/appointment_cancelled',
          performList: {
            url: '/api/zapier/triggers/appointment_cancelled/list',
          },
        },
      },
      {
        key: 'payment_completed',
        noun: 'Payment',
        display: {
          label: 'Payment Completed',
          description: 'Triggers when a payment is received',
          hidden: false,
          important: true,
        },
        operation: {
          type: 'hook',
          url: '/api/webhooks/zapier/payment_completed',
          performList: {
            url: '/api/zapier/triggers/payment_completed/list',
          },
        },
      },
      {
        key: 'customer_created',
        noun: 'Customer',
        display: {
          label: 'New Customer',
          description: 'Triggers when a new customer is added',
          hidden: false,
          important: true,
        },
        operation: {
          type: 'hook',
          url: '/api/webhooks/zapier/customer_created',
          performList: {
            url: '/api/zapier/triggers/customer_created/list',
          },
        },
      },
    ];
  }

  /**
   * Define Zapier actions
   */
  getActions() {
    return [
      {
        key: 'create_appointment',
        noun: 'Appointment',
        display: {
          label: 'Create Appointment',
          description: 'Create a new appointment',
          hidden: false,
          important: true,
        },
        operation: {
          type: 'action',
          url: '/api/zapier/actions/create_appointment',
          inputFields: [
            {
              key: 'customer_name',
              required: true,
              label: 'Customer Name',
              type: 'string',
            },
            {
              key: 'customer_email',
              required: true,
              label: 'Customer Email',
              type: 'string',
            },
            {
              key: 'service',
              required: true,
              label: 'Service',
              type: 'string',
              choices: ['Haircut', 'Beard Trim', 'Fade', 'Line-up', 'Hair Wash'],
            },
            {
              key: 'start_time',
              required: true,
              label: 'Start Time',
              type: 'datetime',
            },
            {
              key: 'duration_minutes',
              required: true,
              label: 'Duration (minutes)',
              type: 'integer',
              default: 30,
            },
          ],
          outputFields: [
            {
              key: 'id',
              label: 'Appointment ID',
              type: 'string',
            },
            {
              key: 'confirmation_code',
              label: 'Confirmation Code',
              type: 'string',
            },
          ],
          sample: {
            id: 'appt-123',
            confirmation_code: 'ABC123',
          },
        },
      },
      {
        key: 'send_sms',
        noun: 'SMS',
        display: {
          label: 'Send SMS',
          description: 'Send an SMS message',
          hidden: false,
        },
        operation: {
          type: 'action',
          url: '/api/zapier/actions/send_sms',
          inputFields: [
            {
              key: 'phone_number',
              required: true,
              label: 'Phone Number',
              type: 'string',
            },
            {
              key: 'message',
              required: true,
              label: 'Message',
              type: 'text',
            },
          ],
          outputFields: [
            {
              key: 'success',
              label: 'Success',
              type: 'boolean',
            },
          ],
        },
      },
      {
        key: 'send_email',
        noun: 'Email',
        display: {
          label: 'Send Email',
          description: 'Send an email message',
          hidden: false,
        },
        operation: {
          type: 'action',
          url: '/api/zapier/actions/send_email',
          inputFields: [
            {
              key: 'email',
              required: true,
              label: 'Email Address',
              type: 'string',
            },
            {
              key: 'subject',
              required: true,
              label: 'Subject',
              type: 'string',
            },
            {
              key: 'body',
              required: true,
              label: 'Email Body',
              type: 'text',
            },
          ],
          outputFields: [
            {
              key: 'success',
              label: 'Success',
              type: 'boolean',
            },
          ],
        },
      },
      {
        key: 'create_customer',
        noun: 'Customer',
        display: {
          label: 'Create Customer',
          description: 'Create a new customer',
          hidden: false,
          important: true,
        },
        operation: {
          type: 'action',
          url: '/api/zapier/actions/create_customer',
          inputFields: [
            {
              key: 'name',
              required: true,
              label: 'Customer Name',
              type: 'string',
            },
            {
              key: 'email',
              required: true,
              label: 'Email',
              type: 'string',
            },
            {
              key: 'phone',
              required: false,
              label: 'Phone',
              type: 'string',
            },
          ],
          outputFields: [
            {
              key: 'id',
              label: 'Customer ID',
              type: 'string',
            },
          ],
        },
      },
    ];
  }

  /**
   * Test authentication
   */
  async testAuth(accessToken) {
    try {
      const response = await axios.get('https://zapier.com/api/v1/apps', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { authenticated: true };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }
}

module.exports = ZapierService;
