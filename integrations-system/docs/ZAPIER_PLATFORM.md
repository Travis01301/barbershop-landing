# Zapier Platform Integration Guide

This guide explains how to register and maintain the barbershop SaaS app on the Zapier platform.

## Overview

The Zapier integration exposes the barbershop system as an app that can be connected to 5000+ apps including:

- **Communication**: Slack, Discord, Microsoft Teams, Telegram
- **SMS**: Twilio, SendGrid, Vonage
- **Email**: Gmail, Outlook, SendGrid
- **Scheduling**: Calendly, Acuity Scheduling
- **CRM**: Salesforce, HubSpot, Pipedrive
- **Accounting**: QuickBooks, Stripe, Square

## Zapier Platform Setup

### 1. Register on Zapier Platform

1. Go to https://platform.zapier.com
2. Sign in with your Zapier account (create one if needed)
3. Click "Build an App"
4. Create a new app:
   - **App Name**: Barbershop SaaS
   - **App Description**: Connect appointments, customers, and payments to 5000+ apps
   - **App Category**: Scheduling & Calendar
   - **Homepage URL**: https://barbershop-saas.com
   - **Help/Support URL**: https://support.barbershop-saas.com

### 2. Configure OAuth

```
Client ID: <from environment>
Client Secret: <from environment>
Authorization URL: https://your-domain.com/api/oauth/authorize/zapier
Token Exchange URL: https://your-domain.com/api/oauth/callback/zapier
Scopes: read write
```

### 3. Define Triggers

Triggers are events from your app that start Zaps.

#### trigger: appointment_created

```javascript
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
    url: 'https://your-domain.com/api/webhooks/zapier/appointment_created',
    performList: {
      url: 'https://your-domain.com/api/zapier/triggers/appointment_created/list',
      sample: {
        id: 'appt-123',
        customer_id: 'cust-123',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1-555-0123',
        service: 'Haircut',
        barber_id: 'barber-123',
        barber_name: 'Bob',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T10:30:00Z',
        duration_minutes: 30,
        price: 25.00,
        status: 'confirmed',
        notes: 'Customer notes',
        created_at: '2024-01-14T15:30:00Z',
      },
    },
  },
}
```

#### trigger: appointment_cancelled

```javascript
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
    url: 'https://your-domain.com/api/webhooks/zapier/appointment_cancelled',
    performList: {
      url: 'https://your-domain.com/api/zapier/triggers/appointment_cancelled/list',
      sample: {
        id: 'appt-123',
        customer_name: 'John Doe',
        cancel_reason: 'Customer requested',
        cancelled_at: '2024-01-14T14:00:00Z',
      },
    },
  },
}
```

#### trigger: payment_completed

```javascript
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
    url: 'https://your-domain.com/api/webhooks/zapier/payment_completed',
    performList: {
      url: 'https://your-domain.com/api/zapier/triggers/payment_completed/list',
      sample: {
        id: 'payment-123',
        appointment_id: 'appt-123',
        customer_name: 'John Doe',
        amount: 25.00,
        payment_method: 'card',
        status: 'completed',
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  },
}
```

#### trigger: customer_created

```javascript
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
    url: 'https://your-domain.com/api/webhooks/zapier/customer_created',
    performList: {
      url: 'https://your-domain.com/api/zapier/triggers/customer_created/list',
      sample: {
        id: 'cust-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        address: '123 Main St',
        created_at: '2024-01-14T15:30:00Z',
      },
    },
  },
}
```

### 4. Define Actions

Actions are things your app can do when triggered by other apps.

#### action: create_appointment

```javascript
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
    url: 'https://your-domain.com/api/zapier/actions/create_appointment',
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
        key: 'customer_phone',
        required: true,
        label: 'Customer Phone',
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
      {
        key: 'notes',
        required: false,
        label: 'Notes',
        type: 'text',
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
      {
        key: 'status',
        label: 'Status',
        type: 'string',
      },
    ],
  },
}
```

#### action: send_sms

```javascript
{
  key: 'send_sms',
  noun: 'SMS',
  display: {
    label: 'Send SMS',
    description: 'Send an SMS message to a customer',
    hidden: false,
  },
  operation: {
    type: 'action',
    url: 'https://your-domain.com/api/zapier/actions/send_sms',
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
        maxLength: 160,
      },
    ],
    outputFields: [
      {
        key: 'success',
        label: 'Success',
        type: 'boolean',
      },
      {
        key: 'message_id',
        label: 'Message ID',
        type: 'string',
      },
    ],
  },
}
```

#### action: send_email

Similar to send_sms but for emails.

#### action: create_customer

Allows external apps to create customers in your system.

## Common Zapier Automations

### 1. Slack Notification for New Appointments

Trigger: `appointment_created`
Action: Slack → Send Channel Message

### 2. SMS Reminder Before Appointment

Trigger: Zapier Scheduler (daily)
Condition: Appointments in next 24 hours
Action: `send_sms` (your barbershop app)

### 3. Google Sheets Log

Trigger: `appointment_created`
Action: Google Sheets → Create Spreadsheet Row

### 4. Discord Announcements

Trigger: `payment_completed`
Action: Discord → Send Message

### 5. Email Receipt

Trigger: `payment_completed`
Action: `send_email` (your barbershop app)

## Testing on Zapier Platform

1. Go to your app's "Test" section
2. Create test webhook payloads matching your samples
3. Test each trigger and action
4. Verify sample data is returned correctly
5. Test error scenarios (missing fields, invalid data)

## Submitting to Zapier App Store

1. Complete all required app information
2. Add app icon and screenshots
3. Write compelling app description
4. Include use cases and integration examples
5. Submit for Zapier review
6. Wait for approval (typically 2-7 days)

## Maintenance

- Monitor webhook delivery logs
- Fix broken triggers/actions quickly
- Keep documentation updated
- Respond to user feedback
- Update samples with real data

## Example Webhook Payload

```json
{
  "id": "appt-123",
  "event_type": "appointment_created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "appointment": {
      "id": "appt-123",
      "customer_id": "cust-456",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+1-555-0123",
      "service": "Haircut",
      "barber_id": "barber-789",
      "barber_name": "Bob Smith",
      "start_time": "2024-01-15T10:00:00Z",
      "end_time": "2024-01-15T10:30:00Z",
      "duration_minutes": 30,
      "price": 25.00,
      "status": "confirmed",
      "notes": "New customer, first time"
    }
  }
}
```
