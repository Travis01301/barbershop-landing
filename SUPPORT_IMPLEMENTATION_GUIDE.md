# Support Ticketing System - Implementation Guide

## 🎯 Overview

This guide provides step-by-step instructions for implementing the Support Ticketing System in your barbershop SaaS platform.

---

## 📋 Pre-Requisites

- [ ] Node.js 18+
- [ ] PostgreSQL 13+
- [ ] Resend account (for email)
- [ ] Admin access to the SaaS platform
- [ ] Existing authentication system

---

## ✅ Implementation Checklist

### Phase 1: Database Setup

#### Step 1: Run Database Migration
```bash
# Connect to your PostgreSQL database
psql -h your-host -U your-user -d barbershop < db/migrations/023_support_ticketing_system.sql

# Verify tables were created
psql -h your-host -U your-user -d barbershop -c "\dt" | grep support
```

#### Step 2: Verify Schema
```sql
-- Check support_tickets table
SELECT * FROM support_tickets LIMIT 1;

-- Check support_staff table
SELECT * FROM support_staff LIMIT 1;

-- Check knowledge_base_articles table
SELECT * FROM knowledge_base_articles LIMIT 1;

-- Check email_queue table
SELECT * FROM email_queue LIMIT 1;
```

### Phase 2: Environment Setup

#### Step 1: Configure Environment Variables
```bash
# .env.local or .env.production

# Email Integration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email Processor Security
CRON_SECRET=your-secure-cron-token-12345

# Database (should already exist)
DATABASE_URL=postgresql://user:password@host:5432/barbershop

# Optional: Email Configuration
SUPPORT_EMAIL=support@barbershop.com
SUPPORT_EMAIL_REPLY_TO=support@barbershop.com
```

#### Step 2: Test Resend Integration
```typescript
// Test file: scripts/test-email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  const response = await resend.emails.send({
    from: 'support@barbershop.com',
    to: 'your-email@example.com',
    subject: 'Test Email',
    html: '<p>Test email from support system</p>'
  });

  console.log(response);
}

testEmail();
```

### Phase 3: API Implementation

#### Step 1: Verify API Routes Exist
```bash
# Check that all API routes are created
ls -la app/api/support/
# Should see:
# - tickets/route.ts
# - tickets/[id]/route.ts
# - tickets/[id]/reply/route.ts
# - tickets/[id]/satisfaction/route.ts
# - knowledge-base/route.ts
# - admin/dashboard/route.ts
# - admin/staff/route.ts
# - email-processor/route.ts
```

#### Step 2: Test API Endpoints
```bash
# Test creating a ticket
curl -X POST http://localhost:3000/api/support/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "shop_id": "shop-123",
    "subject": "Test Ticket",
    "description": "Test description",
    "category": "technical",
    "priority": "high"
  }'

# Test getting tickets
curl http://localhost:3000/api/support/tickets?shop_id=shop-123 \
  -H "Authorization: Bearer your-token"

# Test admin dashboard
curl http://localhost:3000/api/support/admin/dashboard?shop_id=shop-123 \
  -H "Authorization: Bearer your-token"
```

### Phase 4: Component Integration

#### Step 1: Add Support Pages

Create `/app/support/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import TicketForm from '@/components/support/TicketForm';
import TicketList from '@/components/support/TicketList';
import KnowledgeBase from '@/components/support/KnowledgeBase';
import ChatWidget from '@/components/support/ChatWidget';

export default function SupportPage() {
  const shopId = 'your-shop-id'; // Get from session
  const [activeTab, setActiveTab] = useState('tickets');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              My Tickets
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'new'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              New Ticket
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'faq'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Knowledge Base
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'tickets' && <TicketList shopId={shopId} />}
        {activeTab === 'new' && <TicketForm shopId={shopId} />}
        {activeTab === 'faq' && <KnowledgeBase shopId={shopId} />}
      </div>

      {/* Chat Widget */}
      <ChatWidget shopId={shopId} />
    </div>
  );
}
```

#### Step 2: Add Admin Dashboard

Create `/app/admin/support/page.tsx`:
```typescript
'use client';

import AdminTicketQueue from '@/components/support/AdminTicketQueue';

export default function AdminSupportPage() {
  const shopId = 'your-shop-id'; // Get from session

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Support Dashboard</h1>
        <AdminTicketQueue shopId={shopId} />
      </div>
    </div>
  );
}
```

#### Step 3: Add to Navigation

Update your main layout to include support links:
```typescript
// In your navigation component
<nav>
  <Link href="/support">Support</Link>
  <Link href="/admin/support">Support Admin</Link>
</nav>
```

### Phase 5: Email Processing Setup

#### Option A: External Cron (cron-job.org)

1. Go to https://cron-job.org
2. Create new cron job:
   - URL: `https://your-app.com/api/support/email-processor`
   - Method: POST
   - Headers:
     ```
     Authorization: Bearer your-cron-secret
     Content-Type: application/json
     ```
   - Schedule: Every 5 minutes

#### Option B: AWS Lambda + EventBridge

```typescript
// lambda-handler.ts
import { APIGatewayEvent } from 'aws-lambda';
import fetch from 'node-fetch';

export async function handler(event: APIGatewayEvent) {
  const response = await fetch(
    'https://your-app.com/api/support/email-processor',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
}
```

#### Option C: GitHub Actions

Create `.github/workflows/email-processor.yml`:
```yaml
name: Process Support Emails

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  process-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Process pending emails
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/support/email-processor \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

### Phase 6: Testing

#### Step 1: Run Unit Tests
```bash
npm test -- __tests__/support-system.test.ts --coverage
```

#### Step 2: Run Component Tests
```bash
npm test -- __tests__/support-components.test.tsx --coverage
```

#### Step 3: Integration Testing (Manual)

1. **Create Ticket:**
   - Go to /support
   - Click "New Ticket"
   - Fill in form with test data
   - Submit and verify success

2. **View Tickets:**
   - Go to /support
   - Click "My Tickets"
   - Verify ticket appears in list
   - Click ticket to open detail view

3. **Reply to Ticket:**
   - Open a ticket detail
   - Type reply message
   - Submit and verify message appears

4. **Rate Ticket:**
   - Open a resolved ticket
   - Submit satisfaction rating
   - Verify rating appears

5. **Search Knowledge Base:**
   - Go to /support
   - Click "Knowledge Base"
   - Search for test articles
   - Click article and verify content

6. **Admin Dashboard:**
   - Go to /admin/support
   - Verify all KPI cards display correctly
   - Check recent tickets list
   - Verify charts and metrics

### Phase 7: Configuration & Customization

#### Customize Email Templates

Edit `lib/email-service.ts` to customize email HTML/text:

```typescript
// Example: Customize ticket created email
export async function sendTicketCreatedEmail(
  ticketId: string,
  customerEmail: string,
  ticketNumber: string,
  subject: string,
  description: string
) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Support Ticket Created</h2>
      <!-- Customize template here -->
    </div>
  `;
  
  return queueEmail({ /* ... */ });
}
```

#### Configure SLA Times

Edit `app/api/support/tickets/route.ts`:

```typescript
// In the ticket creation endpoint
const slaMinutes = {
  urgent: 15,      // 15 minutes first response
  high: 60,        // 1 hour
  medium: 240,     // 4 hours
  low: 480         // 8 hours
};
```

#### Customize Categories & Priorities

Update the form components:

```typescript
// In components/support/TicketForm.tsx

const CATEGORIES = [
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical Issue' },
  // Add more as needed
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#10B981' },
  // Update colors/labels as needed
];
```

---

## 🔄 Ongoing Operations

### Daily Tasks

- [ ] Monitor admin dashboard for urgent tickets
- [ ] Review SLA breaches
- [ ] Check email queue for failures
- [ ] Respond to customer queries

### Weekly Tasks

- [ ] Review customer satisfaction scores
- [ ] Update knowledge base with common questions
- [ ] Analyze support metrics
- [ ] Plan resource allocation

### Monthly Tasks

- [ ] Review support trends
- [ ] Update SLA targets if needed
- [ ] Archive resolved tickets
- [ ] Train new support staff

### Monitoring

```sql
-- Check email queue health
SELECT status, COUNT(*) as count 
FROM email_queue 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Check ticket stats
SELECT status, COUNT(*) as count 
FROM support_tickets 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Find SLA breaches
SELECT st.ticket_number, st.subject, ssm.first_response_breached, ssm.resolution_breached
FROM support_tickets st
JOIN ticket_sla_metrics ssm ON st.id = ssm.ticket_id
WHERE ssm.first_response_breached = true OR ssm.resolution_breached = true
ORDER BY st.created_at DESC;
```

---

## 🚀 Deployment Checklist

- [ ] Database migration applied successfully
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Components integrated into pages
- [ ] Email processor scheduled
- [ ] Tests passing (95%+ coverage)
- [ ] Support pages accessible
- [ ] Admin dashboard accessible
- [ ] Email sending verified
- [ ] Knowledge base seeded with initial articles
- [ ] Chat widget displays correctly
- [ ] Monitoring/alerting configured

---

## 🔧 Troubleshooting

### Email Not Sending

1. Check RESEND_API_KEY is valid
2. Check email_queue table for failed emails
3. Verify email processor is running
4. Check email recipient is valid

```sql
-- Debug email queue
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

### API 401 Errors

1. Verify auth token is valid
2. Check verifyAuth() function works
3. Verify user has correct role

### Tickets Not Appearing

1. Check shop_id is correct
2. Verify user has created ticket
3. Check permissions in query

```sql
-- Debug tickets
SELECT * FROM support_tickets WHERE shop_id = 'your-shop-id' ORDER BY created_at DESC;
```

### Performance Issues

1. Check indexes exist:
```sql
SELECT * FROM pg_indexes WHERE tablename LIKE 'support%' OR tablename LIKE 'ticket%';
```

2. Analyze slow queries:
```sql
EXPLAIN ANALYZE SELECT * FROM support_tickets WHERE status = 'open';
```

3. Check email_queue size:
```sql
SELECT COUNT(*) FROM email_queue WHERE status = 'pending';
```

---

## 📚 Additional Resources

- **API Documentation:** See SUPPORT_TICKETING_BUILD_SUMMARY.md
- **Component Examples:** Check __tests__/support-components.test.tsx
- **Database Schema:** See db/migrations/023_support_ticketing_system.sql
- **Email Service:** See lib/email-service.ts

---

## ✨ Success Metrics

Once deployed, track these metrics:

| Metric | Target |
|--------|--------|
| Avg First Response Time | <1 hour |
| Avg Resolution Time | <4 hours |
| Customer Satisfaction | >4.5/5 |
| Email Delivery Success | >99% |
| FAQ Deflection Rate | >30% |
| Ticket SLA Compliance | >95% |

---

## 📞 Support

For implementation questions or issues, refer to:
1. Build summary documentation
2. Test files for usage examples
3. API endpoint documentation
4. Component prop documentation

---

**Implementation Guide Complete** ✅

Next steps: Follow the checklist and deploy!
