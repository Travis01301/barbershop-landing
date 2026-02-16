# Barbershop SaaS API Reference

Comprehensive API documentation for the Barbershop SaaS platform, including Reviews, Webhooks, and Third-party Integrations.

## Base URL

```
https://api.barbershop-saas.com/api
```

## Authentication

All API requests require authentication using API keys.

### API Key Authentication

Include your API key in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

### Rate Limiting

API keys are rate-limited. Check your plan for limits. The response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

## Reviews API

### Create Review

Submit a new review for an appointment.

**Endpoint:** `POST /reviews/create`

**Request:**
```json
{
  "appointmentId": 123,
  "customerId": 456,
  "barberId": 789,
  "shopId": 1,
  "rating": 5,
  "comment": "Great haircut and friendly service!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": 1001,
    "rating": 5,
    "comment": "Great haircut and friendly service!",
    "createdAt": "2024-02-16T14:30:00Z"
  }
}
```

**Error Codes:**
- `400`: Validation failed (missing fields, invalid rating)
- `404`: Appointment not found or unauthorized
- `409`: Review already submitted for this appointment
- `500`: Server error

---

### Get Reviews

Retrieve reviews for a shop or barber.

**Endpoint:** `GET /reviews`

**Query Parameters:**
- `shopId` (required): Shop ID
- `barberId` (optional): Filter by barber
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Great service!",
      "customerName": "John Doe",
      "barberName": "Mike",
      "createdAt": "2024-02-16T14:30:00Z"
    }
  ]
}
```

---

### Get Review Analytics

Get detailed analytics on reviews, sentiment, and trends.

**Endpoint:** `GET /reviews/analytics`

**Query Parameters:**
- `shopId` (required): Shop ID
- `barberId` (optional): Filter by barber
- `startDate` (optional): ISO date (YYYY-MM-DD)
- `endDate` (optional): ISO date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalReviews": 150,
    "averageRating": 4.6,
    "fiveStarCount": 120,
    "fourStarCount": 20,
    "threeStarCount": 8,
    "twoStarCount": 2,
    "oneStarCount": 0,
    "responseRate": 85.5,
    "sentimentPositive": 135,
    "sentimentNegative": 5,
    "sentimentNeutral": 10
  },
  "dailyData": [
    {
      "date": "2024-02-16",
      "totalReviews": 10,
      "averageRating": 4.8,
      "responseRate": 90.0
    }
  ]
}
```

---

### Get Google Reviews

Retrieve reviews synced from Google Business Profile.

**Endpoint:** `GET /reviews/google-sync`

**Query Parameters:**
- `shopId` (required): Shop ID
- `limit` (optional): Results per page (default: 50)

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": 1,
      "googleReviewId": "review_xyz",
      "customerName": "Jane Doe",
      "rating": 5,
      "comment": "Excellent haircut!",
      "profileUrl": "https://google.com/...",
      "reviewUrl": "https://google.com/...",
      "syncedAt": "2024-02-16T12:00:00Z"
    }
  ]
}
```

---

### Reply to Review

Add a response to a customer review.

**Endpoint:** `PATCH /reviews/{id}/reply`

**Request:**
```json
{
  "shopId": 1,
  "barberId": 789,
  "responseText": "Thank you for your kind words! We look forward to seeing you again.",
  "responseType": "custom",
  "templateId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response added successfully",
  "response": {
    "id": 501,
    "reviewId": 1,
    "responseText": "Thank you for your kind words!",
    "createdAt": "2024-02-16T15:00:00Z"
  }
}
```

---

## Webhooks API

### Create Webhook

Register a webhook endpoint to receive real-time events.

**Endpoint:** `POST /webhooks/create`

**Request:**
```json
{
  "shopId": 1,
  "webhookUrl": "https://example.com/webhooks/barbershop",
  "events": [
    "appointment_created",
    "appointment_completed",
    "payment_completed",
    "review_submitted"
  ],
  "maxRetries": 5,
  "retryBackoffSeconds": 30,
  "headers": {
    "Authorization": "Bearer your_secret"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook created successfully",
  "webhook": {
    "id": 1,
    "url": "https://example.com/webhooks/barbershop",
    "events": ["appointment_created", "appointment_completed", ...],
    "secret": "whsec_...",
    "createdAt": "2024-02-16T14:30:00Z"
  }
}
```

**Important:** Save the `secret` securely. It's only returned once and is used to verify webhook signatures.

---

### Get Webhooks

List all configured webhooks for a shop.

**Endpoint:** `GET /webhooks`

**Query Parameters:**
- `shopId` (required): Shop ID
- `isActive` (optional): Filter by status (true/false)

**Response:**
```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "url": "https://example.com/webhooks/barbershop",
      "events": ["appointment_created", "payment_completed"],
      "isActive": true,
      "retryEnabled": true,
      "createdAt": "2024-02-16T14:30:00Z"
    }
  ]
}
```

---

### Get Webhook Logs

Retrieve delivery logs for webhooks.

**Endpoint:** `GET /webhooks/logs`

**Query Parameters:**
- `shopId` (required): Shop ID
- `webhookId` (optional): Filter by webhook
- `eventType` (optional): Filter by event type
- `isDelivered` (optional): Filter by delivery status
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "eventType": "appointment_created",
      "webhookUrl": "https://example.com/webhooks/barbershop",
      "httpStatusCode": 200,
      "responseBody": "{ \"received\": true }",
      "errorMessage": null,
      "attemptNumber": 1,
      "isDelivered": true,
      "sentAt": "2024-02-16T14:30:00Z",
      "deliveredAt": "2024-02-16T14:30:01Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Webhook Events

#### Payload Structure

All webhook payloads follow this structure:

```json
{
  "id": "evt_abc123",
  "type": "appointment_created",
  "timestamp": "2024-02-16T14:30:00Z",
  "shopId": 1,
  "data": {
    "appointmentId": 123,
    "customerId": 456,
    "barberId": 789,
    ...
  }
}
```

#### Signature Verification

Webhook payloads are signed with HMAC-SHA256. Verify the signature using the webhook secret:

```javascript
const crypto = require('crypto');
const signature = req.headers['x-barbershop-signature'];
const secret = 'whsec_...';
const body = req.rawBody; // Raw request body

const hash = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

if (hash !== signature) {
  throw new Error('Invalid signature');
}
```

#### Supported Events

- `appointment_created` - New appointment scheduled
- `appointment_completed` - Appointment marked as completed
- `appointment_cancelled` - Appointment cancelled
- `payment_completed` - Payment processed successfully
- `payment_failed` - Payment failed
- `customer_registered` - New customer registered
- `review_submitted` - Customer submitted a review
- `customer_updated` - Customer profile updated

---

## API Keys

### Create API Key

Generate a new API key for programmatic access.

**Endpoint:** `POST /api-keys`

**Request:**
```json
{
  "shopId": 1,
  "keyName": "Mobile App",
  "rateLimit": 5000,
  "expiresAt": "2025-02-16T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key created successfully",
  "apiKey": {
    "id": 1,
    "key": "sk_live_abc123xyz",
    "secret": "secret_xyz",
    "name": "Mobile App",
    "rateLimit": 5000,
    "createdAt": "2024-02-16T14:30:00Z",
    "expiresAt": "2025-02-16T00:00:00Z"
  }
}
```

**Important:** The key and secret are only returned once. Store them securely.

---

### Get API Keys

List all API keys for a shop.

**Endpoint:** `GET /api-keys`

**Query Parameters:**
- `shopId` (required): Shop ID

**Response:**
```json
{
  "success": true,
  "apiKeys": [
    {
      "id": 1,
      "name": "Mobile App",
      "keyHash": "sk_...",
      "rateLimit": 5000,
      "isActive": true,
      "lastUsedAt": "2024-02-16T12:00:00Z",
      "createdAt": "2024-02-16T14:30:00Z"
    }
  ]
}
```

---

## Integrations

### OAuth Connection Status

Check OAuth connection status for a provider.

**Endpoint:** `GET /integrations/oauth`

**Query Parameters:**
- `shopId` (required): Shop ID
- `provider` (required): Provider name (e.g., 'google', 'zapier')

**Response:**
```json
{
  "success": true,
  "connected": true,
  "provider": "google",
  "isExpired": false,
  "expiresAt": "2024-03-16T14:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar"
}
```

---

### Save OAuth Token

Store OAuth token after authorization callback.

**Endpoint:** `POST /integrations/oauth`

**Request:**
```json
{
  "shopId": 1,
  "provider": "google",
  "providerUserId": "google_user_123",
  "accessToken": "access_token_xyz",
  "refreshToken": "refresh_token_xyz",
  "expiresAt": "2024-03-16T14:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OAuth connection saved successfully",
  "connection": {
    "id": 1,
    "provider": "google",
    "providerUserId": "google_user_123",
    "createdAt": "2024-02-16T14:30:00Z"
  }
}
```

---

### Get Marketplace Apps

List available apps or installed apps.

**Endpoint:** `GET /integrations/marketplace`

**Query Parameters:**
- `shopId` (required): Shop ID
- `onlyInstalled` (optional): Show only installed apps (true/false)

**Response:**
```json
{
  "success": true,
  "apps": [
    {
      "id": 1,
      "name": "Zapier",
      "description": "Connect your barbershop to 1000+ apps",
      "iconUrl": "https://...",
      "developerName": "Zapier Inc.",
      "rating": 4.8,
      "isInstalled": true
    }
  ]
}
```

---

### Install/Uninstall Marketplace App

Install or uninstall a marketplace app.

**Endpoint:** `POST /integrations/marketplace`

**Request:**
```json
{
  "shopId": 1,
  "appId": 1,
  "action": "install"
}
```

**Response:**
```json
{
  "success": true,
  "message": "App installed successfully"
}
```

**Actions:** `install` or `uninstall`

---

## Error Handling

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "details": "Additional technical details if available"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (auth required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate/already exists)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Webhook Retry Logic

Webhooks are automatically retried on failure with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: After 30 seconds (or configured backoff)
- **Attempt 3**: After 60 seconds
- **Attempt 4**: After 120 seconds
- **Attempt 5**: After 240 seconds

Failed deliveries can be viewed in webhook logs and retried manually.

---

## Rate Limiting

Rate limits are enforced per API key. When you exceed your limit:

- HTTP Status: `429 Too Many Requests`
- Headers:
  - `X-RateLimit-Limit`: Your limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Changelog

### v1.0.0 (2024-02-16)

Initial release with:
- Reviews API (create, retrieve, analytics)
- Webhooks (create, retrieve, logs)
- API Keys management
- OAuth integrations
- Marketplace integrations
- Google Business Profile sync

---

## Support

For API support and questions:
- Email: api-support@barbershop-saas.com
- Slack: Join our developer community
- Docs: https://docs.barbershop-saas.com
