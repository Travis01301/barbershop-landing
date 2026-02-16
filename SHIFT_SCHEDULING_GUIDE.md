# Staff Shift Scheduling System - Complete Guide

## Overview

The Staff Shift Scheduling System provides comprehensive shift management capabilities for barbershop SaaS, enabling barbers and shop owners to:

- Define shop operating hours and recurring shift templates
- Manage barber availability and schedule preferences
- Assign barbers to shifts with conflict detection
- Handle time-off requests with approval workflows
- Support shift swaps between barbers
- Analyze coverage metrics and identify staffing gaps

## Architecture

### Database Schema

The system uses 7 core tables:

1. **shop_operating_hours** - Define when the shop operates each day
2. **shift_templates** - Recurring shift definitions (e.g., "Morning 9-1", "Afternoon 1-5")
3. **barber_availability** - Weekly availability patterns per barber
4. **barber_shifts** - Actual shift assignments
5. **time_off_requests** - Time-off requests with approval status
6. **shift_swaps** - Shift swap requests between barbers
7. **shift_history** - Audit trail of all schedule changes

### Service Layer

**shift-scheduling-service.ts** provides all business logic:

- Shift template CRUD operations
- Availability management
- Shift assignment with conflict detection
- Time-off request workflows
- Shift swap handling
- Coverage analysis and recommendations

### API Endpoints

#### Shift Templates
```
GET    /api/shifts/templates              - List all templates
POST   /api/shifts/templates              - Create template
PATCH  /api/shifts/templates/[id]         - Update template
DELETE /api/shifts/templates/[id]         - Delete template
```

#### Shift Assignment
```
POST   /api/shifts/assign                 - Assign barber to shift
GET    /api/shifts/board                  - View shift calendar
PATCH  /api/shifts/[id]                   - Update shift
DELETE /api/shifts/[id]                   - Delete shift
```

#### Barber Availability
```
GET    /api/availability?barberId=X       - Get barber availability
POST   /api/availability                  - Set availability for a day
```

#### Time-Off Management
```
GET    /api/time-off                      - List time-off requests
POST   /api/time-off                      - Request time-off
PATCH  /api/timeoff/approve?requestId=X   - Approve time-off
PATCH  /api/timeoff/deny?requestId=X      - Deny time-off
```

#### Shift Swaps
```
GET    /api/shifts/swap/request?barberId=X - Get pending swaps
POST   /api/shifts/swap/request           - Request swap
PATCH  /api/shifts/swap/[id]              - Approve/deny swap
```

#### Coverage Analytics
```
GET    /api/shifts/coverage               - Get coverage stats
```

## Key Features

### 1. Shift Templates

Create recurring shift definitions that can be applied across multiple weeks:

```typescript
// Create a morning shift template
await shiftService.createShiftTemplate(
  shopId,
  'Morning Shift',
  '09:00',
  '13:00',
  {
    description: 'Morning shift from 9am to 1pm',
    minBarbersRequired: 1,
    maxBarbersAllowed: 3,
    recurringPattern: 'weekdays',
    recurringDays: '[1, 2, 3, 4, 5]' // Mon-Fri
  }
)
```

### 2. Barber Availability

Barbers set their preferred working hours and days:

```typescript
// Mark barber as available Monday-Friday 9-5
await shiftService.setBarberAvailability(
  shopId,
  barberId,
  1, // Monday (0 = Sunday)
  true,
  {
    availabilityType: 'regular',
    startTime: '09:00',
    endTime: '17:00',
    preferenceLevel: 'preferred' // 'preferred', 'willing', or 'unavailable'
  }
)
```

### 3. Shift Assignment

Assign barbers to shifts with automatic conflict detection:

```typescript
// Assign barber to a shift
await shiftService.assignBarberToShift(
  shopId,
  barberId,
  '2026-02-17',
  '09:00',
  '13:00',
  {
    shiftTemplateId: 1,
    notes: 'Cover for vacation',
    assignedBy: adminUserId
  }
)
```

**Conflict Detection:**
- Prevents overlapping shifts for the same barber
- Blocks assignments during approved time-off
- Validates shift times (start < end)

### 4. Time-Off Requests

Barbers request time-off; admins approve or deny:

```typescript
// Barber requests time-off
const request = await shiftService.requestTimeOff(
  shopId,
  barberId,
  '2026-02-20',
  '2026-02-25',
  {
    reason: 'vacation',
    description: 'Family trip'
  }
)

// Admin approves - automatically cancels all shifts during this period
await shiftService.approveTimeOff(requestId, shopId, adminUserId)

// Or admin denies
await shiftService.denyTimeOff(requestId, shopId, adminUserId, 'Insufficient coverage')
```

### 5. Shift Swaps

Barbers can request to swap shifts with coworkers:

```typescript
// Barber A wants to swap their Shift 1 for Barber B's Shift 2
const swap = await shiftService.requestShiftSwap(
  shopId,
  barberAId,     // requesting_barber
  barberBId,     // requested_barber
  shiftId1,      // shift to give
  shiftId2,      // shift to receive
  'Please cover for me'
)

// Barber B approves
await shiftService.approveShiftSwap(swapId, shopId)

// Or denies
await shiftService.denyShiftSwap(swapId, shopId)
```

### 6. Coverage Analytics

Analyze coverage for any date range:

```typescript
const coverage = await shiftService.getShiftCoverage(
  shopId,
  '2026-02-16',
  '2026-02-22'
)

// Returns array with coverage status per shift:
// {
//   shiftDate: '2026-02-17',
//   startTime: '09:00',
//   endTime: '13:00',
//   assignedBarbers: 2,
//   minimumRequired: 1,
//   status: 'covered' | 'understaffed' | 'overstaffed'
// }
```

### 7. Auto-Assignment Suggestions

Get recommendations for uncovered shifts:

```typescript
const suggestions = await shiftService.getAutoAssignmentSuggestions(
  shopId,
  '2026-02-17',
  '09:00',
  '13:00'
)

// Returns array of available barbers sorted by preference level
// [
//   { barberId: 1, name: 'John', preferenceScore: 3 }, // Preferred
//   { barberId: 2, name: 'Jane', preferenceScore: 2 }, // Willing
// ]
```

## React Components

### ShiftBoard

Display shift calendar with coverage status:

```tsx
<ShiftBoard
  shopId={1}
  token={authToken}
  startDate="2026-02-16"
  endDate="2026-02-22"
  viewMode="week"
  onShiftClick={(shift) => console.log(shift)}
  onCoverageUpdate={(coverage) => updateStats(coverage)}
/>
```

**Features:**
- Calendar grid showing all shifts and barbers
- Color-coded shift status (assigned, confirmed, pending, cancelled)
- Coverage indicators (green/yellow/red)
- Summary statistics

### AvailabilitySelector

Allow barbers to set weekly availability:

```tsx
<AvailabilitySelector
  barberId={1}
  shopId={1}
  token={authToken}
  onSave={(availability) => updateBackend(availability)}
  initialAvailability={existingAvailability}
/>
```

**Features:**
- Day-by-day availability toggle
- Time slot configuration
- Preference levels (preferred/willing/unavailable)
- Bulk save

### TimeOffRequestForm

Submit time-off requests:

```tsx
<TimeOffRequestForm
  barberId={1}
  shopId={1}
  token={authToken}
  onSuccess={(request) => showConfirmation()}
  onCancel={() => closeModal()}
/>
```

**Features:**
- Date range picker with validation
- Reason selection
- Description field
- Duration preview

### CoverageStats

Display coverage metrics and health score:

```tsx
<CoverageStats
  shopId={1}
  token={authToken}
  startDate="2026-02-16"
  endDate="2026-02-22"
  onRefresh={() => fetchLatestStats()}
/>
```

**Features:**
- Overall coverage health score
- Covered/understaffed/overstaffed counts
- Average barbers per shift
- Actionable recommendations

## Validation

All inputs are validated using Zod schemas:

```typescript
// Validation examples from lib/validation.ts
CreateShiftTemplateSchema
SetBarberAvailabilitySchema
AssignBarberToShiftSchema
RequestTimeOffSchema
RequestShiftSwapSchema
ShiftBoardQuerySchema
CoverageQuerySchema
```

## Error Handling

### Common Error Scenarios

1. **Shift Conflict** (409)
   - Barber already has a shift during the requested time
   - Solution: Reassign or delete conflicting shift

2. **Time-Off Conflict** (409)
   - Barber has approved time-off during requested date
   - Solution: Deny time-off request first

3. **Unauthorized** (401)
   - Missing or invalid JWT token
   - Solution: Provide valid Authorization header

4. **Not Found** (404)
   - Shift template, shift, or request not found
   - Solution: Verify ID and permissions

5. **Validation Error** (400)
   - Invalid input data
   - Solution: Check error details and correct input

## Authentication & Authorization

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

The token payload should include:
```typescript
{
  shopId: number;  // Required to scope all operations
  userId: number;  // Required to track who made changes
  role: string;    // 'admin' or 'barber'
}
```

**Authorization Rules:**
- Barbers can view/update their own availability and request time-off
- Barbers can request shifts and swaps (admin assigns)
- Only admins can approve/deny time-off and swaps
- Only admins can view coverage analytics

## Best Practices

### 1. Shift Template Design
- Create templates for common shift patterns
- Use `min_barbers_required` to ensure coverage
- Set `recurring_days` to automate weekly schedules

### 2. Coverage Management
- Monitor coverage weekly via `/api/shifts/coverage`
- Address understaffed shifts promptly
- Use auto-assignment suggestions for quick filling

### 3. Conflict Prevention
- Set clear barber availability before assigning
- Check conflicts before manual assignments
- Review time-off requests in advance

### 4. Time-Off Workflow
1. Barber submits request via form
2. System validates dates and conflicts
3. Admin reviews and approves/denies
4. If approved, all shifts cancelled automatically
5. Barber receives notification

### 5. Shift Swap Process
1. Barber A requests swap with Barber B
2. System validates both shifts belong to correct barbers
3. Barber B reviews and approves/denies
4. If approved, shifts are exchanged atomically

## Integration Points

### With Appointments
- Don't book appointments for barbers with approved time-off
- Respect shift boundaries when scheduling

### With Notifications
- Notify barbers when shifts assigned
- Alert admins to coverage gaps
- Confirm time-off approvals/denials
- Notify both barbers on swap requests

### With Analytics
- Track shift coverage trends
- Identify peak/low staffing periods
- Analyze barber utilization rates

## Testing

Comprehensive test suites cover:

1. **Unit Tests** (`shift-scheduling-service.test.ts`)
   - CRUD operations
   - Conflict detection
   - Validation logic
   - Coverage calculations

2. **Integration Tests** (`__tests__/api/shifts.test.ts`)
   - API endpoint behavior
   - Authentication/authorization
   - Error responses
   - Data consistency

3. **Component Tests** (via React Testing Library)
   - User interactions
   - Form submissions
   - State management
   - Error displays

Run tests:
```bash
npm run test
npm run test:coverage  # Generate coverage report
```

## Performance Optimization

### Database Indexes
- `idx_barber_shifts_shop_date` - Fast date range queries
- `idx_barber_availability_shop_barber` - Quick availability lookups
- `idx_time_off_status` - Status filtering for list views
- `idx_shift_swaps_status` - Pending swap queries

### Query Optimization
- Use parameterized queries to prevent injection
- Batch similar updates (e.g., cancel multiple shifts)
- Limit date ranges for coverage queries
- Soft delete shifts to preserve history

### Caching Strategy
- Cache shift templates (change rarely)
- Cache barber availability (weekly resets)
- Don't cache time-off (changes frequently)
- Don't cache shift assignments (volatile)

## Migration Guide

### From Manual Scheduling
1. Set up shop operating hours
2. Create shift templates
3. Import barber availability
4. Migrate existing shifts
5. Enable time-off requests

### From Other Systems
1. Map roles: schedule managers → admins
2. Import shop hours structure
3. Import barber availability preferences
4. Bulk import past shifts (read-only)
5. Set up notifications

## Troubleshooting

### Coverage showing 0 assigned barbers
- Check barber availability is set for that day
- Verify shifts are created, not just templates
- Ensure shifts aren't soft-deleted

### Time-off requests not blocking shifts
- Confirm time-off was approved (not pending)
- Check date range includes shift date
- Verify shop_id matches

### Shift swaps failing to approve
- Ensure both shifts exist and belong to correct barbers
- Check shifts aren't already cancelled
- Verify barbers haven't changed roles

## Support

For issues or questions:
1. Check error message details
2. Review validation schema requirements
3. Verify JWT token and permissions
4. Check database connection
5. Review recent schema changes

---

**Last Updated:** 2026-02-16
**Version:** 1.0.0
