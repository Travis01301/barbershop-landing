# Group Bookings API Specification

## Base URL
```
https://api.barbershop.app/api/groups
```

## Authentication
All endpoints require JWT bearer token in Authorization header:
```
Authorization: Bearer {jwt_token}
```

## Response Format
All responses are JSON:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "details": { "field": "error message" }
}
```

## Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## Endpoints

### 1. Create Group Booking

**POST** `/groups/create`

Create a new group booking.

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "shopId": "uuid",
  "groupName": "Bachelor Party",
  "groupSize": 8,
  "notes": "Friday evening preferred"
}
```

**Validation:**
- `shopId` (required): Valid UUID
- `groupName` (required): 1-255 characters
- `groupSize` (required): Integer 2-100
- `notes` (optional): String

**Response (201 Created):**
```json
{
  "success": true,
  "groupBooking": {
    "id": "uuid",
    "shopId": "uuid",
    "organizerCustomerId": "uuid",
    "groupName": "Bachelor Party",
    "groupSize": 8,
    "totalCost": 0,
    "subtotalCost": 0,
    "discountPercent": 0,
    "discountAmount": 0,
    "status": "pending",
    "notes": "Friday evening preferred",
    "createdAt": "2025-02-16T10:00:00Z",
    "updatedAt": "2025-02-16T10:00:00Z"
  }
}
```

**Errors:**
- 400: Invalid groupSize
- 401: Unauthorized
- 500: Server error

---

### 2. Get Group Details

**GET** `/groups/{id}`

Get group details with all members.

**Parameters:**
- `id` (path): Group ID (UUID)

**Response (200 OK):**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "shopId": "uuid",
    "groupName": "Bachelor Party",
    "groupSize": 8,
    "totalCost": 200,
    "subtotalCost": 250,
    "discountPercent": 20,
    "discountAmount": 50,
    "status": "confirmed",
    "members": 6,
    "createdAt": "2025-02-16T10:00:00Z"
  },
  "members": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "barberId": "uuid",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "slotTime": "2025-03-15T10:00:00Z",
      "servicePrice": 25,
      "status": "confirmed",
      "createdAt": "2025-02-16T10:05:00Z"
    }
  ]
}
```

**Errors:**
- 401: Unauthorized
- 404: Group not found
- 500: Server error

---

### 3. Update Group

**PATCH** `/groups/{id}`

Update group name or notes.

**Parameters:**
- `id` (path): Group ID (UUID)

**Request Body:**
```json
{
  "groupName": "Updated Name",
  "notes": "Updated notes"
}
```

**Validation:**
- `groupName` (optional): 1-255 characters
- `notes` (optional): String

**Response (200 OK):**
```json
{
  "success": true,
  "groupBooking": { ... }
}
```

**Errors:**
- 400: Invalid input
- 401: Unauthorized
- 403: Not group organizer
- 404: Group not found
- 500: Server error

---

### 4. Add Member

**POST** `/groups/{id}/members`

Add a member to the group.

**Parameters:**
- `id` (path): Group ID (UUID)

**Request Body:**
```json
{
  "customerId": "uuid",
  "barberId": "uuid",
  "slotTime": "2025-03-15T10:00:00Z",
  "servicePrice": 25,
  "serviceType": "Haircut",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890"
}
```

**Validation:**
- `customerId` (optional): Valid UUID
- `barberId` (optional): Valid UUID
- `slotTime` (required): ISO date string
- `servicePrice` (required): Positive number
- Other fields: Optional

**Response (201 Created):**
```json
{
  "success": true,
  "member": {
    "id": "uuid",
    "groupBookingId": "uuid",
    "customerId": "uuid",
    "barberId": "uuid",
    "slotTime": "2025-03-15T10:00:00Z",
    "servicePrice": 25,
    "status": "pending",
    "createdAt": "2025-02-16T10:10:00Z"
  }
}
```

**Errors:**
- 400: Group at capacity, validation error
- 401: Unauthorized
- 403: Not group organizer
- 404: Group not found
- 500: Server error

---

### 5. Reassign Barber

**PATCH** `/groups/{id}/members/{memberId}`

Change barber assignment for a member.

**Parameters:**
- `id` (path): Group ID (UUID)
- `memberId` (path): Member ID (UUID)

**Request Body:**
```json
{
  "barberId": "uuid",
  "slotTime": "2025-03-15T11:00:00Z"
}
```

**Validation:**
- `barberId` (required): Valid UUID
- `slotTime` (required): ISO date string

**Response (200 OK):**
```json
{
  "success": true,
  "member": { ... }
}
```

**Errors:**
- 400: Barber not available, validation error
- 401: Unauthorized
- 403: Not group organizer
- 404: Group/member not found
- 500: Server error

---

### 6. Remove Member

**DELETE** `/groups/{id}/members/{memberId}`

Remove a member from the group.

**Parameters:**
- `id` (path): Group ID (UUID)
- `memberId` (path): Member ID (UUID)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed from group"
}
```

**Errors:**
- 401: Unauthorized
- 403: Not group organizer
- 404: Group/member not found
- 500: Server error

---

### 7. Confirm Group

**POST** `/groups/{id}/confirm`

Create appointments for all members.

**Parameters:**
- `id` (path): Group ID (UUID)

**Request Body (optional):**
```json
{
  "memberIds": ["uuid1", "uuid2"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "groupBooking": {
    "id": "uuid",
    "status": "confirmed",
    "totalCost": 200,
    ...
  }
}
```

**Errors:**
- 400: Members missing barber assignments
- 401: Unauthorized
- 403: Not group organizer
- 404: Group not found
- 500: Server error

---

### 8. Cancel Group

**POST** `/groups/{id}/cancel`

Cancel entire group booking.

**Parameters:**
- `id` (path): Group ID (UUID)

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Validation:**
- `reason` (optional): String

**Response (200 OK):**
```json
{
  "success": true,
  "groupBooking": {
    "id": "uuid",
    "status": "cancelled",
    ...
  }
}
```

**Errors:**
- 401: Unauthorized
- 403: Not group organizer
- 404: Group not found
- 500: Server error

---

### 9. Get My Groups

**GET** `/groups/my-groups`

Get all groups created by the authenticated user.

**Response (200 OK):**
```json
{
  "success": true,
  "groups": [
    {
      "id": "uuid",
      "groupName": "Bachelor Party",
      "status": "confirmed",
      "totalCost": 200,
      "members": [ ... ],
      "memberCount": 6,
      "createdAt": "2025-02-16T10:00:00Z"
    }
  ]
}
```

**Errors:**
- 401: Unauthorized
- 500: Server error

---

### 10. Create Payment Intent

**POST** `/groups/{id}/payment`

Create Stripe payment intent for group.

**Parameters:**
- `id` (path): Group ID (UUID)

**Request Body:**
```json
{
  "amount": 200,
  "email": "organizer@example.com",
  "paymentMethodType": "card"
}
```

**Validation:**
- `amount` (required): Positive number
- `email` (required): Valid email
- `paymentMethodType` (optional): card, apple_pay, google_pay

**Response (200 OK):**
```json
{
  "success": true,
  "clientSecret": "pi_123_secret_456",
  "paymentIntentId": "pi_123"
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized
- 403: Not group organizer
- 404: Group not found
- 500: Stripe error, server error

---

### 11. Get Discount Rules

**GET** `/groups/discounts?shopId={shopId}`

Get discount rules for a shop.

**Query Parameters:**
- `shopId` (required): Shop UUID

**Response (200 OK):**
```json
{
  "success": true,
  "discounts": [
    {
      "id": "uuid",
      "shopId": "uuid",
      "minGroupSize": 4,
      "discountPercent": 10,
      "description": "4+ people discount",
      "isActive": true
    },
    {
      "id": "uuid",
      "minGroupSize": 6,
      "discountPercent": 15,
      "description": "6+ people discount"
    }
  ]
}
```

**Errors:**
- 400: Missing shopId
- 500: Server error

---

### 12. Set Discount Rule

**POST** `/groups/discounts`

Set discount rule for a shop.

**Request Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "shopId": "uuid",
  "minGroupSize": 6,
  "discountPercent": 15,
  "description": "6+ people discount"
}
```

**Validation:**
- `shopId` (required): Valid UUID
- `minGroupSize` (required): Integer >= 2
- `discountPercent` (required): 0-100
- `description` (optional): String

**Response (200 OK):**
```json
{
  "success": true,
  "discount": {
    "id": "uuid",
    "shopId": "uuid",
    "minGroupSize": 6,
    "discountPercent": 15,
    "isActive": true,
    "createdAt": "2025-02-16T10:00:00Z"
  }
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized
- 403: Not shop admin
- 500: Server error

---

## Data Types

### Group Status
```
pending              - Initial state, no members confirmed
partial-confirmed    - Some members confirmed, rest pending
confirmed            - All members confirmed
completed            - All appointments completed
cancelled            - Group cancelled
```

### Member Status
```
pending              - Added, not confirmed
confirmed            - Appointment created
completed            - Appointment completed
cancelled            - Removed from group
no-show              - Didn't appear for appointment
```

### Payment Status
```
pending              - Payment intent created
confirmed            - Payment successful
failed               - Payment failed
refunded             - Refund processed
cancelled            - Payment cancelled
```

---

## Example Workflows

### Workflow 1: Create and Confirm Group

```javascript
// 1. Create group
const createRes = await fetch('/api/groups/create', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    shopId: 'shop-1',
    groupName: 'Party',
    groupSize: 6
  })
})
const { groupBooking } = await createRes.json()
const groupId = groupBooking.id

// 2. Add members
for (const member of members) {
  await fetch(`/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' },
    body: JSON.stringify(member)
  })
}

// 3. Confirm group
await fetch(`/api/groups/${groupId}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' }
})

// 4. Process payment
const paymentRes = await fetch(`/api/groups/${groupId}/payment`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    amount: groupBooking.totalCost,
    email: 'organizer@example.com'
  })
})
const { clientSecret } = await paymentRes.json()

// Use Stripe to complete payment with clientSecret
```

### Workflow 2: Manage Group Members

```javascript
// Get group
const getRes = await fetch(`/api/groups/${groupId}`, {
  headers: { 'Authorization': 'Bearer token' }
})
const { booking, members } = await getRes.json()

// Reassign member's barber
await fetch(`/api/groups/${groupId}/members/${memberId}`, {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    barberId: 'barber-2',
    slotTime: '2025-03-15T11:00:00Z'
  })
})

// Remove member
await fetch(`/api/groups/${groupId}/members/${memberId}`, {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer token' }
})
```

---

## Rate Limiting

Rate limits per user:
- 100 requests per minute
- 1000 requests per hour

Retry after `X-RateLimit-Reset` header.

---

## Changelog

### v1.0.0 (2025-02-16)
- Initial release
- Core endpoints (create, get, update, members, confirm, cancel)
- Payment integration
- Discount system
- Full API specification

---

## Support

For API issues or questions:
1. Check error details
2. Review documentation
3. Check logs
4. Contact support with request ID (in response headers)
