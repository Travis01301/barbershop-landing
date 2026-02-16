# Shift Scheduling API Reference

## Base URL
```
https://api.yourbarbershop.com/api
```

## Authentication
All requests require JWT token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 1. SHIFT TEMPLATES

### List All Shift Templates
```
GET /shifts/templates
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "shop_id": 1,
      "name": "Morning Shift",
      "description": "Morning shift from 9am to 1pm",
      "start_time": "09:00",
      "end_time": "13:00",
      "min_barbers_required": 1,
      "max_barbers_allowed": 3,
      "is_recurring": true,
      "recurring_pattern": "weekdays",
      "recurring_days": "[1, 2, 3, 4, 5]",
      "is_active": true,
      "created_by": 1,
      "created_at": "2026-02-16T10:00:00Z",
      "updated_at": "2026-02-16T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Create Shift Template
```
POST /shifts/templates
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Afternoon Shift",
  "description": "Afternoon shift from 1pm to 5pm",
  "startTime": "13:00",
  "endTime": "17:00",
  "minBarbersRequired": 1,
  "maxBarbersAllowed": 3,
  "recurringPattern": "weekdays",
  "recurringDays": "[1, 2, 3, 4, 5]",
  "isActive": true
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "template": {
    "id": 2,
    "name": "Afternoon Shift",
    "start_time": "13:00",
    "end_time": "17:00",
    ...
  }
}
```

### Update Shift Template
```
PATCH /shifts/templates/{id}
Content-Type: application/json
```

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Afternoon Shift",
  "startTime": "13:30",
  "endTime": "17:30",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "template": { ... }
}
```

### Delete Shift Template
```
DELETE /shifts/templates/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift template deleted"
}
```

---

## 2. BARBER SHIFTS

### Assign Barber to Shift
```
POST /shifts/assign
Content-Type: application/json
```

**Request Body:**
```json
{
  "barberId": 1,
  "shiftTemplateId": 1,
  "shiftDate": "2026-02-17",
  "startTime": "09:00",
  "endTime": "13:00",
  "notes": "Regular morning shift"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "shift": {
    "id": 42,
    "shop_id": 1,
    "barber_id": 1,
    "shift_template_id": 1,
    "shift_date": "2026-02-17",
    "start_time": "09:00",
    "end_time": "13:00",
    "status": "assigned",
    "notes": "Regular morning shift",
    "assigned_by": 1,
    "confirmed_at": null,
    "created_at": "2026-02-16T10:00:00Z",
    "updated_at": "2026-02-16T10:00:00Z",
    "deleted_at": null
  }
}
```

**Error Responses:**
- 409: Shift conflict or time-off conflict
- 400: Invalid times or date

### Get Shift Board
```
GET /shifts/board?startDate=2026-02-16&endDate=2026-02-22
```

**Response:**
```json
{
  "success": true,
  "shifts": [
    {
      "id": 42,
      "barber_id": 1,
      "barber_name": "John Smith",
      "shift_date": "2026-02-17",
      "start_time": "09:00",
      "end_time": "13:00",
      "status": "assigned"
    }
  ],
  "shiftsByDate": {
    "2026-02-17": [
      { ... }
    ]
  },
  "totalShifts": 5
}
```

### Update Shift
```
PATCH /shifts/{id}
Content-Type: application/json
```

**Request Body:** (All optional)
```json
{
  "barberId": 2,
  "status": "confirmed",
  "notes": "Updated notes",
  "startTime": "09:30",
  "endTime": "13:30"
}
```

**Response:**
```json
{
  "success": true,
  "shift": { ... }
}
```

### Delete Shift
```
DELETE /shifts/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift deleted"
}
```

---

## 3. BARBER AVAILABILITY

### Get Barber Availability
```
GET /availability?barberId=1
```

**Response:**
```json
{
  "success": true,
  "availability": [
    {
      "id": 1,
      "shop_id": 1,
      "barber_id": 1,
      "day_of_week": 1,
      "is_available": true,
      "availability_type": "regular",
      "start_time": "09:00",
      "end_time": "17:00",
      "preference_level": "preferred",
      "created_at": "2026-02-16T10:00:00Z",
      "updated_at": "2026-02-16T10:00:00Z"
    }
  ],
  "count": 7
}
```

### Set Barber Availability
```
POST /availability
Content-Type: application/json
```

**Request Body:**
```json
{
  "barberId": 1,
  "dayOfWeek": 1,
  "isAvailable": true,
  "availabilityType": "regular",
  "startTime": "09:00",
  "endTime": "17:00",
  "preferenceLevel": "preferred"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "availability": { ... }
}
```

---

## 4. TIME-OFF REQUESTS

### Get Time-Off Requests
```
GET /time-off[?status=pending][&barberId=1]
```

**Query Parameters:**
- `status` (optional): "pending", "approved", or "denied"
- `barberId` (optional): Filter by barber

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "barber_id": 1,
      "start_date": "2026-02-20",
      "end_date": "2026-02-25",
      "reason": "vacation",
      "description": "Family trip",
      "status": "pending",
      "requested_at": "2026-02-16T10:00:00Z",
      "approved_at": null,
      "approved_by": null,
      "denial_reason": null
    }
  ]
}
```

### Request Time-Off
```
POST /time-off
Content-Type: application/json
```

**Request Body:**
```json
{
  "barberId": 1,
  "startDate": "2026-02-20",
  "endDate": "2026-02-25",
  "reason": "vacation",
  "description": "Family vacation"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "request": {
    "id": 1,
    "barber_id": 1,
    "start_date": "2026-02-20",
    "end_date": "2026-02-25",
    "reason": "vacation",
    "status": "pending",
    "requested_at": "2026-02-16T10:00:00Z"
  }
}
```

### Approve Time-Off
```
PATCH /timeoff/approve?requestId=1
Content-Type: application/json
```

**Request Body:**
```json
{
  "approvedBy": 1
}
```

**Response:**
```json
{
  "success": true,
  "request": {
    "id": 1,
    "status": "approved",
    "approved_at": "2026-02-16T10:30:00Z",
    "approved_by": 1
  },
  "message": "Time-off request approved. All shifts during this period have been cancelled."
}
```

### Deny Time-Off
```
PATCH /timeoff/deny?requestId=1
Content-Type: application/json
```

**Request Body:**
```json
{
  "approvedBy": 1,
  "denialReason": "Insufficient coverage"
}
```

**Response:**
```json
{
  "success": true,
  "request": {
    "id": 1,
    "status": "denied",
    "denial_reason": "Insufficient coverage"
  },
  "message": "Time-off request denied."
}
```

---

## 5. SHIFT SWAPS

### Get Pending Swap Requests
```
GET /shifts/swap/request?barberId=1
```

**Response:**
```json
{
  "success": true,
  "swaps": [
    {
      "id": 1,
      "shop_id": 1,
      "requesting_barber_id": 1,
      "requested_barber_id": 2,
      "shift_id_to_give": 42,
      "shift_id_to_receive": 43,
      "status": "pending",
      "requested_at": "2026-02-16T10:00:00Z",
      "responded_at": null,
      "notes": "Please cover for me"
    }
  ],
  "count": 1
}
```

### Request Shift Swap
```
POST /shifts/swap/request
Content-Type: application/json
```

**Request Body:**
```json
{
  "requestingBarberId": 1,
  "requestedBarberId": 2,
  "shiftIdToGive": 42,
  "shiftIdToReceive": 43,
  "notes": "Can you cover my Tuesday shift?"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "swap": {
    "id": 1,
    "requesting_barber_id": 1,
    "requested_barber_id": 2,
    "shift_id_to_give": 42,
    "shift_id_to_receive": 43,
    "status": "pending",
    "requested_at": "2026-02-16T10:00:00Z"
  }
}
```

### Approve/Deny Shift Swap
```
PATCH /shifts/swap/{id}
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Sure, I can cover it"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift swap approved and shifts have been exchanged."
}
```

---

## 6. COVERAGE ANALYTICS

### Get Coverage Statistics
```
GET /shifts/coverage?startDate=2026-02-16&endDate=2026-02-22[&includeDetails=false]
```

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `includeDetails` (optional): Include full coverage details (default: false)

**Response:**
```json
{
  "success": true,
  "coverage": [
    {
      "shiftDate": "2026-02-17",
      "startTime": "09:00",
      "endTime": "13:00",
      "assignedBarbers": 2,
      "minimumRequired": 1,
      "status": "covered"
    }
  ],
  "stats": {
    "totalShifts": 10,
    "coveredShifts": 8,
    "understaffedShifts": 2,
    "overstaffedShifts": 0,
    "coveragePercentage": 80,
    "avgBarbersPerShift": "1.8"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "errors": {
    "startTime": "Start time must be before end time",
    "barberId": "Barber ID is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Shift not found"
}
```

### 409 Conflict
```json
{
  "error": "Shift conflict: Barber already has a shift during this time"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to assign barber to shift"
}
```

---

## Rate Limiting

- **Limit:** 100 requests per minute
- **Headers:** 
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1645040400`

---

## Webhooks (Future)

Coming soon:
- `shift.created` - When a shift is assigned
- `shift.deleted` - When a shift is cancelled
- `timeoff.requested` - When time-off is requested
- `timeoff.approved` - When time-off is approved
- `swap.requested` - When a swap is requested
- `swap.approved` - When a swap is approved

---

## Code Examples

### cURL

```bash
# Get shift templates
curl -X GET https://api.yourbarbershop.com/api/shifts/templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create shift template
curl -X POST https://api.yourbarbershop.com/api/shifts/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Shift",
    "startTime": "09:00",
    "endTime": "13:00",
    "minBarbersRequired": 1
  }'

# Assign barber to shift
curl -X POST https://api.yourbarbershop.com/api/shifts/assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "barberId": 1,
    "shiftDate": "2026-02-17",
    "startTime": "09:00",
    "endTime": "13:00"
  }'
```

### JavaScript/Fetch

```javascript
// Get coverage stats
const response = await fetch(
  '/api/shifts/coverage?startDate=2026-02-16&endDate=2026-02-22',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
)

const data = await response.json()
console.log(data.stats)

// Request time-off
const response = await fetch('/api/time-off', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    barberId: 1,
    startDate: '2026-02-20',
    endDate: '2026-02-25',
    reason: 'vacation'
  })
})

const result = await response.json()
```

### Python/Requests

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Get shift board
response = requests.get(
    'https://api.yourbarbershop.com/api/shifts/board',
    params={
        'startDate': '2026-02-16',
        'endDate': '2026-02-22'
    },
    headers=headers
)

data = response.json()
print(data['shifts'])
```

---

**Last Updated:** 2026-02-16
**Version:** 1.0.0
