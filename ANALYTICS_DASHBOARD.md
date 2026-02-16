# Analytics Dashboard - Complete Implementation

## Overview

A complete analytics dashboard for the barbershop booking system with comprehensive metrics tracking, revenue analysis, appointment performance, and barber productivity insights.

## Implementation Summary

### 1. Analytics Service (`lib/analytics-service.ts`)

Core service providing all analytics queries and calculations.

#### Key Functions:

- **`getDateRange(rangeString: string)`** - Converts date range strings ('7d', '30d', '90d') to Date objects
  - Validates input and defaults to 30 days
  - Sets start time to 00:00:00 and end time to 23:59:59

- **`getRevenueSummary(shopId, dateRange)`** - Comprehensive revenue analysis
  - Total revenue calculation
  - Daily revenue breakdown
  - Revenue by service
  - Revenue by barber

- **`getAppointmentMetrics(shopId, dateRange)`** - Appointment performance metrics
  - Total appointments count
  - Completed, cancelled, and no-show counts
  - Completion rate (%)
  - Cancellation rate (%)
  - No-show rate (%)

- **`getPeakTimesHeatmap(shopId, dateRange)`** - Peak hours and days analysis
  - Appointments by hour of day
  - Appointments by day of week
  - Returns data suitable for heatmap visualization

- **`getBarberPerformance(shopId, dateRange)`** - Individual barber metrics
  - Total appointments handled
  - Appointments by status (completed, cancelled, no-show)
  - Revenue generated
  - Average customer rating
  - Review count
  - Completion rate

- **`getCustomerAcquisitionTrends(shopId, dateRange)`** - Customer trends analysis
  - New customer count per day
  - Returning customer count per day
  - Total appointments per day

- **`getAnalyticsDashboard(shopId, dateRangeString)`** - Complete dashboard data
  - Aggregates all analytics functions
  - Validates date range parameter
  - Returns comprehensive AnalyticsDashboard object

#### Data Types:

```typescript
interface RevenueSummary {
  totalRevenue: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  byService: Array<{ service: string; revenue: number; count: number }>;
  byBarber: Array<{ barberId: number; barberName: string; revenue: number }>;
}

interface AppointmentMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
}

interface PeakTimesHeatmap {
  hourOfDay: number;
  dayOfWeek: number;
  dayName: string;
  hourLabel: string;
  appointments: number;
}

interface BarberPerformance {
  barberId: number;
  barberName: string;
  appointmentsTotal: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  completionRate: number;
}

interface CustomerAcquisitionTrends {
  date: string;
  newCustomers: number;
  returningCustomers: number;
  totalAppointments: number;
}

interface AnalyticsDashboard {
  revenue: RevenueSummary;
  appointments: AppointmentMetrics;
  peakTimes: PeakTimesHeatmap[];
  barberPerformance: BarberPerformance[];
  customerAcquisition: CustomerAcquisitionTrends[];
  dateRange: DateRange;
}
```

### 2. API Route (`app/api/analytics/dashboard/route.ts`)

RESTful endpoint for fetching analytics data.

#### Endpoint:
```
GET /api/analytics/dashboard?shopId=X&dateRange=7d|30d|90d
```

#### Query Parameters:
- `shopId` (required): Numeric shop ID
- `dateRange` (optional): '7d', '30d', or '90d' (defaults to '30d')

#### Response:
```json
{
  "success": true,
  "data": {
    "revenue": { ... },
    "appointments": { ... },
    "peakTimes": [ ... ],
    "barberPerformance": [ ... ],
    "customerAcquisition": [ ... ],
    "dateRange": { "startDate": "...", "endDate": "..." }
  }
}
```

#### Error Responses:
- 400: Missing or invalid parameters
- 404: Shop not found
- 500: Server error

### 3. React Components

Five specialized components for the dashboard UI:

#### `AnalyticsSummary` (`components/analytics/AnalyticsSummary.tsx`)
Summary metric cards displaying:
- Total revenue with daily average
- Total appointments with completion count
- Cancellation rate with trend indicator
- No-show rate with trend indicator

Props:
```typescript
interface AnalyticsSummaryProps {
  revenue: RevenueSummary;
  appointments: AppointmentMetrics;
}
```

#### `RevenueChart` (`components/analytics/RevenueChart.tsx`)
Line chart with revenue breakdown:
- Daily revenue trend (line chart)
- Revenue breakdown by service (list)
- Revenue breakdown by barber (list)

Props:
```typescript
interface RevenueChartProps {
  revenue: RevenueSummary;
}
```

#### `NoShowTrend` (`components/analytics/NoShowTrend.tsx`)
Bar chart for customer acquisition:
- New customers vs returning customers
- Summary statistics:
  - Average new customers per day
  - Average returning customers per day
  - Total appointments

Props:
```typescript
interface NoShowTrendProps {
  customerAcquisition: CustomerAcquisitionTrends[];
}
```

#### `BarberPerformanceTable` (`components/analytics/BarberPerformance.tsx`)
Comprehensive table with:
- Barber name
- Total appointments count
- Completed/Cancelled/No-Show counts with badges
- Completion rate with progress bar
- Revenue generated
- Star rating with review count

Props:
```typescript
interface BarberPerformanceProps {
  barberPerformance: BarberPerformance[];
}
```

#### `PeakTimesHeatmapComponent` (`components/analytics/PeakTimesHeatmap.tsx`)
Interactive heatmap showing:
- Hours (0-23) vs Days of Week
- Color intensity based on appointment count
- Legend explaining color scale
- Responsive table layout

Props:
```typescript
interface PeakTimesHeatmapProps {
  peakTimes: PeakTimesHeatmap[];
}
```

### 4. Analytics Dashboard Page (`app/barber/dashboard/page.tsx`)

Main dashboard page integrating all components:

#### Features:
- Date range selection (7d, 30d, 90d)
- Real-time data fetching from API
- Responsive grid layout
- Loading and error states
- Shop ID management via localStorage

#### Layout:
1. Header with title and date range filters
2. Analytics summary cards (4-column responsive grid)
3. Revenue chart and customer acquisition trend (2-column grid)
4. Peak times heatmap (full width)
5. Barber performance table (full width)

#### Route:
```
/barber/dashboard
```

### 5. Tests (`lib/analytics-service.test.ts`)

Comprehensive test suite with 31 passing tests covering:

#### Test Categories:

1. **Date Range Tests** (6 tests)
   - 7-day, 30-day, 90-day ranges
   - Invalid input handling
   - Start/end time formatting

2. **Date Range Validation** (2 tests)
   - Invalid range handling
   - Valid range acceptance

3. **Revenue Calculations** (3 tests)
   - Correct precision (2 decimal places)
   - Zero revenue handling
   - Large amounts handling

4. **Appointment Metrics** (5 tests)
   - Completion rate calculation
   - Cancellation rate calculation
   - No-show rate calculation
   - Zero appointments handling
   - Rate sum validation

5. **Data Formatting** (3 tests)
   - Date formatting
   - 24-hour time format
   - Leading zero padding

6. **Barber Performance** (2 tests)
   - Completion rate calculation
   - No appointments scenario

7. **Query Validation** (4 tests)
   - Shop ID numeric validation
   - Non-numeric ID handling
   - Date range validation
   - Invalid range rejection

8. **Data Aggregation** (3 tests)
   - Daily revenue aggregation
   - Average revenue calculation
   - Empty array handling

9. **Heatmap Data** (3 tests)
   - Day of week mapping
   - Maximum value calculation
   - Intensity percentage

**All tests passing:** ✓ 31/31

## Database Schema Requirements

The implementation assumes the following tables exist:

- `shops` - Shop information
- `appointments` - Appointment records with status field supporting 'completed', 'cancelled', 'no-show'
- `payments` - Payment records with amount and status
- `services` - Service definitions
- `users` - Barber information
- `reviews` - Customer reviews
- `customer_profiles` - Customer information

### Required Columns:

**appointments:**
- id, shop_id, barber_id, start_time, status, service_id, service_name, created_at

**payments:**
- id, appointment_id, amount, status

**users:**
- id, shop_id, name, role

**reviews:**
- id, appointment_id, barber_id, rating

**customer_profiles:**
- id, created_at

**services:**
- id, name

## Usage Examples

### Fetching Analytics via API

```bash
# Get 30-day analytics
curl "http://localhost:3000/api/analytics/dashboard?shopId=1&dateRange=30d"

# Get 7-day analytics
curl "http://localhost:3000/api/analytics/dashboard?shopId=1&dateRange=7d"

# Get 90-day analytics
curl "http://localhost:3000/api/analytics/dashboard?shopId=1&dateRange=90d"
```

### Using in React Component

```typescript
import { AnalyticsDashboard } from '@/lib/analytics-service';
import { AnalyticsSummary } from '@/components/analytics/AnalyticsSummary';

export function MyDashboard() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);

  useEffect(() => {
    fetch('/api/analytics/dashboard?shopId=1&dateRange=30d')
      .then(r => r.json())
      .then(result => setData(result.data));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <AnalyticsSummary
        revenue={data.revenue}
        appointments={data.appointments}
      />
      {/* Other components... */}
    </div>
  );
}
```

## Performance Considerations

1. **Database Indexing**: Queries use indexed columns:
   - shop_id, start_time, status on appointments
   - appointment_id on payments
   - barber_id on users

2. **Parallel Queries**: The `getAnalyticsDashboard` function uses `Promise.all()` to fetch all data in parallel

3. **Date Range Limits**: Supports efficient queries for 7, 30, and 90-day periods

4. **Aggregation**: Database-side aggregation reduces data transfer

## Future Enhancements

1. **Caching**: Add Redis caching for frequently accessed analytics
2. **Real-time Updates**: Implement WebSocket for live metric updates
3. **Export**: Add PDF/CSV export functionality
4. **Comparisons**: Add period-over-period comparison views
5. **Alerts**: Set up alerts for thresholds (e.g., high no-show rate)
6. **Custom Ranges**: Support arbitrary date range selection
7. **Filtering**: Add filters by barber, service, payment method
8. **Drill-down**: Interactive drill-down into specific metrics

## Troubleshooting

### Common Issues

1. **"Shop not found" error**
   - Ensure shopId parameter is valid
   - Check that the shop exists in database

2. **"Invalid dateRange" error**
   - Use only '7d', '30d', or '90d'
   - Check for typos in parameter

3. **No data returned**
   - Verify shop has appointments in date range
   - Check appointment status values (should be 'completed', 'cancelled', or 'no-show')

4. **Slow queries**
   - Verify database indexes are created
   - Consider reducing date range
   - Check database server performance

## Testing

Run the test suite:

```bash
npm test -- lib/analytics-service.test.ts
```

Expected output: **31 tests passed**

## Files Created/Modified

### New Files:
- `lib/analytics-service.ts` - Main analytics service
- `lib/analytics-service.test.ts` - Test suite
- `app/api/analytics/dashboard/route.ts` - API endpoint
- `components/analytics/AnalyticsSummary.tsx` - Summary component
- `components/analytics/RevenueChart.tsx` - Revenue chart component
- `components/analytics/NoShowTrend.tsx` - Customer acquisition component
- `components/analytics/BarberPerformance.tsx` - Barber performance table
- `components/analytics/PeakTimesHeatmap.tsx` - Heatmap component
- `app/barber/dashboard/page.tsx` - Dashboard page
- `ANALYTICS_DASHBOARD.md` - This documentation

### Dependencies:
- `recharts` (already installed) - Chart library
- Standard React 19 and Next.js 16

## Deployment

The dashboard is production-ready:

1. **Build**: `npm run build`
2. **Start**: `npm start`
3. **Access**: Navigate to `/barber/dashboard`

All components are client-side rendered with proper loading states and error handling.

---

**Status**: ✅ Complete and Tested
**Last Updated**: 2026-02-15
**Test Coverage**: 31/31 tests passing
