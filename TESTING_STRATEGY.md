# Testing Strategy - Barbershop Landing

## Overview

This document outlines the comprehensive testing strategy for the barbershop-landing project. Our approach combines unit tests, integration tests, and component tests to ensure code quality and reliability.

## Technology Stack

- **Test Framework**: Jest 29.7.0
- **React Testing Library**: For component testing (@testing-library/react)
- **User Event**: For simulating user interactions (@testing-library/user-event)
- **Logging**: Custom structured logger (Winston/Pino style)

## Test Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| Statements | 50% | 0% |
| Branches | 50% | 0% |
| Functions | 50% | 0% |
| Lines | 50% | 0% |

Coverage thresholds are defined in `jest.config.js` and will fail the build if not met.

## Test Organization

### Directory Structure

```
__tests__/
├── api/
│   ├── payments/
│   │   └── intent.test.ts        # Payment intent creation tests
│   └── available-slots.test.ts    # Slot availability calculation tests
├── components/
│   └── BookingForm.test.tsx       # Form rendering & state management
└── lib/
    └── logger.test.ts             # Logging utility tests (future)
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## API Route Testing

### 1. Payment Intent Endpoint (`/api/payments/intent`)

**File**: `__tests__/api/payments/intent.test.ts`

**Test Coverage**:

- ✅ Valid payment intent creation with all required fields
- ✅ Missing appointmentId validation
- ✅ Missing amount validation
- ✅ Missing email validation
- ✅ Amount conversion to cents (Stripe requirement)
- ✅ Description generation with fallback
- ✅ Metadata attachment (appointmentId, shopId)
- ✅ Email receipt configuration
- ✅ Database persistence (INSERT with ON CONFLICT)
- ✅ Shop lookup by slug
- ✅ Error handling (Stripe API failures)

**Key Test Cases**:

```typescript
// Valid input
POST /api/payments/intent
{
  appointmentId: "123",
  amount: 100,
  email: "customer@example.com",
  description: "Haircut deposit",
  shopSlug: "main-shop"
}
// Expected: 200, success: true, clientSecret + paymentIntentId

// Missing amount
POST /api/payments/intent
{ appointmentId: "123", email: "...", shopSlug: "..." }
// Expected: 400, error: "Missing required fields"
```

**Dependencies Mocked**:
- `stripe`: PaymentIntents API
- `pg`: PostgreSQL pool (shop query, payment insert)

---

### 2. Available Slots Endpoint (`/api/available-slots`)

**File**: `__tests__/api/available-slots.test.ts`

**Test Coverage**:

- ✅ Valid slot calculation for a working day
- ✅ Missing shopId validation
- ✅ Missing barberId validation
- ✅ Missing date validation
- ✅ Invalid date format rejection
- ✅ 30-minute slot generation
- ✅ Schedule retrieval by day of week
- ✅ Existing appointment conflict detection
- ✅ Multiple appointment handling
- ✅ ISO 8601 time format validation
- ✅ No schedule for date (return empty)
- ✅ Barber not working on date (return empty)

**Key Test Cases**:

```typescript
// Valid request with available slots
GET /api/available-slots?shopId=1&barberId=1&date=2026-02-15
// Expected: 200, availableSlots: [{startTime, endTime}, ...]

// Barber not working
GET /api/available-slots?shopId=1&barberId=1&date=2026-02-15
// (barber schedule: is_working = false)
// Expected: 200, availableSlots: []

// Slots with conflicts
// Existing appointment: 09:30-10:00
// Generated slots skip conflicting times
```

**Dependencies Mocked**:
- `pg`: Schedule query, appointments query

---

## Component Testing

### 3. BookingForm Component (`app/book/[slug]/BookingForm.tsx`)

**File**: `__tests__/components/BookingForm.test.tsx`

**Test Coverage**:

**Rendering**:
- ✅ All form fields rendered (email, barber, date, name, phone)
- ✅ All barbers displayed as select options
- ✅ Submit button disabled initially
- ✅ Date input has today as minimum

**State Management**:
- ✅ Email field updates on input
- ✅ Barber selection updates state
- ✅ Date field updates state
- ✅ Name field updates state
- ✅ Phone field updates state

**Customer Lookup**:
- ✅ Fetch existing customer when valid email entered
- ✅ Display welcome message for returning customers
- ✅ Show styling notes if available
- ✅ Handle missing customer gracefully
- ✅ Skip lookup for invalid email format
- ✅ Handle API errors

**Available Slots**:
- ✅ Fetch slots when barber and date selected
- ✅ Display available times as buttons
- ✅ Show "no available slots" message when empty
- ✅ Select time slot updates state

**Form Submission**:
- ✅ Submit button disabled until complete
- ✅ Enable submit when all required fields filled
- ✅ Show loading state during submission
- ✅ Handle successful appointment creation
- ✅ Display success screen with appointment details

**Accessibility**:
- ✅ All inputs have proper labels
- ✅ Required attributes on mandatory fields
- ✅ Semantic HTML structure
- ✅ Focus management

**Key Test Cases**:

```typescript
// Initial render - button disabled
render(<BookingForm {...props} />)
expect(submitButton).toBeDisabled()

// Returning customer
user.type(emailInput, 'returning@example.com')
// Expects: fetch to customer API, welcome message displayed

// Complete form submission
// Fill all fields → Select time slot → Submit
// Expects: success message, appointment details displayed
```

**Dependencies Mocked**:
- `PaymentForm`: Child component
- `ReviewForm`: Child component
- `fetch`: API calls (customer lookup, slot availability, booking)

---

## Logging Strategy

### Structured Logging (`lib/logger.ts`)

The application uses a custom structured logger with four severity levels:

**Levels**:
- `debug`: Development only, detailed diagnostic info
- `info`: General informational messages
- `warn`: Warning conditions that should be monitored
- `error`: Error conditions with full context and stack traces

**Log Entry Format**:
```json
{
  "timestamp": "2026-02-12T18:53:00.000Z",
  "level": "info",
  "message": "Payment intent created successfully",
  "context": {
    "paymentIntentId": "pi_...",
    "appointmentId": "123"
  }
}
```

**API Route Integration**:

All API routes log with a child logger instance:

```typescript
const paymentLogger = logger.createChild('PaymentIntent')

paymentLogger.info('Payment intent request received', { appointmentId, amount })
paymentLogger.warn('Missing required fields', { appointmentId, amount, email })
paymentLogger.error('Payment intent creation error', error, { appointmentId })
```

**Log History**:
- Last 1000 entries stored in memory
- Accessible via `logger.getHistory(count)`
- Useful for debugging and monitoring

---

## Test Execution Flow

```
1. npm test
   ├─ Run jest.config.js setup
   ├─ Load jest.setup.js (environment variables, global mocks)
   ├─ Execute all test files matching __tests__/**/*.test.{ts,tsx}
   ├─ Aggregate results
   ├─ Check coverage thresholds
   └─ Exit with status (0 = success, 1 = failure)

2. npm run test:watch
   └─ Re-run tests on any file change

3. npm run test:coverage
   └─ Generate coverage report in coverage/ directory
```

## Mocking Strategy

### External Dependencies

**Stripe SDK**:
```typescript
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ /* ... */ })
    }
  }))
})
```

**PostgreSQL Pool**:
```typescript
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn()
      .mockResolvedValueOnce({ rows: [/* shop */] })
      .mockResolvedValueOnce({ rows: [/* payment */] })
  }))
}))
```

**Fetch API**:
```typescript
global.fetch = jest.fn()

// In tests:
;(global.fetch as jest.Mock).mockResolvedValueOnce({
  json: async () => ({ success: true, data: {...} })
})
```

### Child Components

For component testing, child components are mocked:

```typescript
jest.mock('@/app/book/[slug]/PaymentForm', () => {
  return function MockPaymentForm() {
    return <div data-testid="payment-form">Payment Form</div>
  }
})
```

---

## Best Practices

### 1. Test Naming

Tests clearly describe the behavior being tested:

```typescript
// ✅ Good
it('should return 400 when amount is missing', async () => { ... })

// ❌ Avoid
it('tests missing amount', async () => { ... })
```

### 2. Arrange-Act-Assert

Each test follows the AAA pattern:

```typescript
// Arrange
const mockRequest = { ... }
const mockPool = { ... }

// Act
const response = await POST(mockRequest)

// Assert
expect(response.status).toBe(200)
expect(data.success).toBe(true)
```

### 3. Isolated Tests

Each test is independent:
- No shared state between tests
- `beforeEach` clears mocks
- Each test sets up its own mock responses

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockReset()
})
```

### 4. User-Centric Testing

Component tests simulate user behavior:

```typescript
// ✅ Test what users do
const user = userEvent.setup()
await user.type(emailInput, 'test@example.com')
await user.selectOptions(barberSelect, '1')

// ❌ Avoid internal state manipulation
setFormData({ email: 'test@example.com' })
```

---

## Coverage Metrics

### Target Areas

1. **API Routes**: 80%+ coverage
   - All validation paths
   - Success and error cases
   - Database interactions

2. **Components**: 70%+ coverage
   - Rendering paths
   - User interactions
   - State transitions
   - Error handling

3. **Utilities**: 90%+ coverage
   - Logger
   - Helpers
   - Constants

### Excluded from Coverage

- `node_modules/`
- `.next/`
- `dist/`
- Type definition files (`*.d.ts`)

---

## Continuous Integration

### Pre-commit Hooks (Recommended)

```bash
# .husky/pre-commit
npm test -- --bail --findRelatedTests
```

### CI Pipeline (GitHub Actions Example)

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

---

## Future Enhancements

1. **E2E Testing**: Add Playwright/Cypress for full user flows
2. **Performance Testing**: Monitor render times, API response times
3. **Visual Regression**: Screenshot-based testing for UI changes
4. **Load Testing**: Simulate high traffic scenarios
5. **Security Testing**: OWASP Top 10 vulnerability checks
6. **Logger Tests**: Unit tests for `lib/logger.ts`

---

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
```
// Increase timeout
jest.setTimeout(10000)
```

**Issue**: Mock not working
```
// Clear and reset all mocks between tests
jest.clearAllMocks()
jest.resetAllMocks()
```

**Issue**: Async/await not completing
```
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

---

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2026-02-12  
**Author**: QA Testing Worker  
**Status**: Active
