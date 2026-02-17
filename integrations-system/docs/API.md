# Advanced Integrations API Documentation

Base URL: `https://api.barbershop-saas.com`

## Authentication

All endpoints require:
- `X-Business-ID` header: Your business UUID
- `Authorization` header: Bearer token (for sensitive operations)

## Integration Management

### List Integrations

```
GET /api/integrations
Headers:
  X-Business-ID: <uuid>
  
Response:
{
  "success": true,
  "integrations": [
    {
      "id": "integration-uuid",
      "provider": "google_calendar",
      "status": "active",
      "config": {...},
      "last_sync": "2024-01-15T10:00:00Z",
      "sync_status": "success",
      "enabled_triggers": ["appointment_created"],
      "enabled_actions": []
    }
  ]
}
```

### Get Integration Details

```
GET /api/integrations/:id
Headers:
  X-Business-ID: <uuid>

Response:
{
  "success": true,
  "integration": {
    "id": "integration-uuid",
    "provider": "google_calendar",
    "status": "active",
    "config": {...},
    "webhook_url": "https://example.com/webhook",
    "webhook_secret": "secret-key",
    "enabled_triggers": ["appointment_created"],
    "enabled_actions": [],
    "last_sync": "2024-01-15T10:00:00Z",
    "sync_status": "success",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Create Integration

```
POST /api/integrations
Headers:
  X-Business-ID: <uuid>
  Content-Type: application/json

Body:
{
  "provider": "google_calendar",
  "config": {
    "calendar_id": "primary",
    "timezone": "America/New_York"
  }
}

Response: 201 Created
{
  "success": true,
  "integration": {...}
}
```

### Update Integration

```
PUT /api/integrations/:id
Headers:
  X-Business-ID: <uuid>
  Content-Type: application/json

Body:
{
  "webhook_url": "https://example.com/webhook",
  "enabled_triggers": ["appointment_created", "payment_completed"],
  "enabled_actions": ["send_sms"]
}

Response: 200 OK
{
  "success": true,
  "integration": {...}
}
```

### Delete Integration

```
DELETE /api/integrations/:id
Headers:
  X-Business-ID: <uuid>

Response: 200 OK
{
  "success": true,
  "message": "Integration deleted"
}
```

### Disconnect OAuth

```
POST /api/integrations/:id/disconnect
Headers:
  X-Business-ID: <uuid>

Response: 200 OK
{
  "success": true,
  "message": "Integration disconnected"
}
```

## OAuth Flow

### Get Authorization URL

```
POST /api/oauth/authorize/:provider
Headers:
  X-Business-ID: <uuid>
  Content-Type: application/json

Body:
{
  "redirect_uri": "https://your-app.com/oauth/callback"
}

Response:
{
  "success": true,
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random-state-value"
}
```

### Handle OAuth Callback

```
POST /api/oauth/callback/:provider
Content-Type: application/json

Body:
{
  "code": "auth-code-from-provider",
  "state": "state-value-from-request",
  "integration_id": "integration-uuid"
}

Response:
{
  "success": true,
  "integration_id": "integration-uuid",
  "provider": "google_calendar",
  "user_email": "user@example.com"
}
```

### Check OAuth Status

```
GET /api/oauth/status/:provider
Headers:
  X-Integration-ID: <uuid>

Response:
{
  "success": true,
  "connected": true,
  "expires_at": "2024-02-15T10:00:00Z",
  "is_expired": false
}
```

## Sync Operations

### Trigger Sync

```
POST /api/sync/:integration_id/trigger
Content-Type: application/json

Body:
{
  "provider": "google_calendar",
  "action": "full_sync"
}

Response:
{
  "success": true,
  "message": "Sync triggered for google_calendar - full_sync"
}
```

### Get Sync Status

```
GET /api/sync/:integration_id/status

Response:
{
  "success": true,
  "sync": {
    "id": "integration-uuid",
    "provider": "google_calendar",
    "sync_status": "success",
    "last_sync": "2024-01-15T10:00:00Z"
  }
}
```

### Sync Appointment to Calendar

```
POST /api/sync/calendar/appointment
Content-Type: application/json

Body:
{
  "integration_id": "integration-uuid",
  "appointment_id": "appt-uuid",
  "provider": "google_calendar"
}

Response:
{
  "success": true,
  "message": "Appointment sync queued"
}
```

### Get Calendar Sync Tracking

```
GET /api/sync/calendar/:integration_id/tracking

Response:
{
  "success": true,
  "tracking": [
    {
      "id": "tracking-uuid",
      "local_appointment_id": "appt-uuid",
      "provider_event_id": "google-event-id",
      "sync_direction": "local_to_remote",
      "last_synced_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Webhooks

### Queue Webhook Event

```
POST /api/webhooks
Content-Type: application/json

Body:
{
  "integration_id": "integration-uuid",
  "event_type": "appointment_created",
  "payload": {
    "appointment_id": "appt-uuid",
    "customer_name": "John Doe"
  }
}

Response:
{
  "success": true,
  "event_id": "event-uuid"
}
```

### Test Webhook URL

```
POST /api/webhooks/test
Content-Type: application/json

Body:
{
  "webhook_url": "https://example.com/webhook"
}

Response:
{
  "success": true,
  "message": "Webhook test successful"
}
```

### Get Webhook Events

```
GET /api/webhooks/:integration_id/events

Response:
{
  "success": true,
  "events": [
    {
      "id": "event-uuid",
      "event_type": "appointment_created",
      "status": "delivered",
      "delivered_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-15T09:59:00Z"
    }
  ]
}
```

## Sync Logs

### Get Integration Logs

```
GET /api/logs/:integration_id?event_type=sync&status=success&limit=50&offset=0

Query Parameters:
  - event_type: sync, auth, webhook, action
  - status: success, failed, pending, retrying
  - action: specific action name
  - limit: number of records (default: 100)
  - offset: pagination offset (default: 0)

Response:
{
  "success": true,
  "logs": [
    {
      "id": "log-uuid",
      "event_type": "sync",
      "action": "appointment_to_provider",
      "status": "success",
      "request_data": {...},
      "response_data": {...},
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

### Get Log Statistics

```
GET /api/logs/:integration_id/stats

Response:
{
  "success": true,
  "stats": {
    "total_events": 1250,
    "by_type": {
      "sync": 800,
      "webhook": 300,
      "auth": 150
    },
    "by_status": {
      "success": 1200,
      "failed": 30,
      "pending": 20
    }
  }
}
```

### Get Recent Errors

```
GET /api/logs/:integration_id/errors?limit=50

Response:
{
  "success": true,
  "errors": [
    {
      "id": "log-uuid",
      "event_type": "sync",
      "action": "calendar_sync",
      "error_message": "Calendar API error: Permission denied",
      "error_code": "403",
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### Retry Failed Sync

```
POST /api/logs/:integration_id/:log_id/retry

Response:
{
  "success": true,
  "message": "Retry queued"
}
```

## Error Responses

All errors return appropriate HTTP status codes with error details:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

API endpoints are rate limited to:
- 100 requests per minute for standard endpoints
- 10 requests per minute for sync operations
- 5 requests per minute for webhook deliveries

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Pagination

List endpoints support pagination:
- `limit`: Items per page (default: 50, max: 500)
- `offset`: Number of items to skip (default: 0)

## Filtering

Most list endpoints support filtering:
```
GET /api/logs/:id?status=failed&event_type=sync&limit=20
```

## Webhooks

Incoming webhooks are signed with HMAC-SHA256:

```
Header: X-Webhook-Signature: <sha256-hash>

// Verify signature
const crypto = require('crypto');
const hash = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

const isValid = hash === signature;
```
