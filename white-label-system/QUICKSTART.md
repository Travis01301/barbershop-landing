# Quick Start Guide

Get up and running with BarberFlow White-Label in 5 minutes!

## 1️⃣ Installation

```bash
# Clone repository
git clone https://github.com/barbershop/white-label.git
cd white-label

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

## 2️⃣ Database Setup

```bash
# Edit .env and set DATABASE_URL
# Example: postgresql://user:password@localhost:5432/white_label

# Run migrations
npm run migrate

# (Optional) Seed with test data
npm run seed
```

## 3️⃣ Start Development Server

```bash
npm run dev
```

Server starts on:
- **API**: http://localhost:3001
- **Frontend**: http://localhost:3000

## 4️⃣ Create Your First Organization

### Via API
```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Barbershop Group",
    "email": "admin@acmebarbershop.com",
    "type": "AGENCY",
    "phone": "(555) 123-4567"
  }'
```

Response:
```json
{
  "id": "org_123",
  "name": "Acme Barbershop Group",
  "email": "admin@acmebarbershop.com",
  "type": "AGENCY"
}
```

### Via UI
1. Open http://localhost:3000
2. Click "Create Organization"
3. Fill in organization details
4. Click "Create"

## 5️⃣ Customize Branding

```bash
# Update branding settings
curl -X PATCH http://localhost:3001/api/organizations/org_123/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "appName": "Acme Cuts",
    "primaryColor": "#FF6B35",
    "secondaryColor": "#0066CC",
    "customDomain": "acmebarbershop.com",
    "welcomeMessage": "Welcome to Acme Barbershop!"
  }'
```

## 6️⃣ Add a Shop

```bash
curl -X POST http://localhost:3001/api/organizations/org_123/shops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Downtown Location",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "phone": "(555) 123-4567",
    "email": "downtown@acmebarbershop.com",
    "capacity": 5
  }'
```

## 7️⃣ Invite Team Members

```bash
curl -X POST http://localhost:3001/api/organizations/org_123/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "manager@acmebarbershop.com",
    "role": "MANAGER"
  }'
```

## 8️⃣ Setup Billing

```bash
curl -X PATCH http://localhost:3001/api/organizations/org_123/billing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "plan": "PROFESSIONAL",
    "monthlyCharge": 299,
    "stripeCustomerId": "cus_ABC123"
  }'
```

## 🎯 Common Tasks

### Get Organization Dashboard
```bash
curl http://localhost:3001/api/organizations/org_123/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List All Shops
```bash
curl http://localhost:3001/api/organizations/org_123/shops \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Team Members
```bash
curl http://localhost:3001/api/organizations/org_123/staff \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Track Analytics
```bash
curl -X POST http://localhost:3001/api/organizations/org_123/analytics/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "metric": "appointment",
    "value": 1
  }'
```

### View Analytics
```bash
curl http://localhost:3001/api/organizations/org_123/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔑 Authentication

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!",
    "organizationId": "org_123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

Response includes JWT token:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "organizationId": "org_123",
    "role": "ADMIN"
  },
  "token": "eyJhbGc..."
}
```

### Use Token in Requests
```bash
curl http://localhost:3001/api/organizations/org_123/settings \
  -H "Authorization: Bearer eyJhbGc..."
```

## 📊 Multi-Tenant Routing

Access organizations by:

### Custom Domain
```
https://acmebarbershop.com/api/organizations/*/shops
```

### Subdomain
```
https://acme.barbershop.com/api/organizations/*/shops
```

### Query Parameter
```
http://localhost:3001/api/organizations/*/shops?org=org_123
```

### Header
```bash
curl http://localhost:3001/api/organizations/*/shops \
  -H "X-Organization-ID: org_123"
```

## 🧪 Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- multiTenant.test.js

# Watch mode
npm test -- --watch
```

## 🎨 React Components Example

```jsx
import React from 'react';
import BrandedLayout from './components/BrandedLayout';
import OrgDashboard from './components/OrgDashboard';
import BrandingEditor from './components/BrandingEditor';

function App() {
  const orgId = 'org_123'; // Get from URL params

  return (
    <BrandedLayout orgId={orgId}>
      <OrgDashboard orgId={orgId} />
      <BrandingEditor orgId={orgId} />
    </BrandedLayout>
  );
}

export default App;
```

## 🚀 Next Steps

1. **Customize Styling**: Update CSS in components
2. **Add Features**: Extend API endpoints and React components
3. **Setup Payment**: Configure Stripe keys in .env
4. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
5. **Test**: Run full test suite before production

## 📚 Documentation

- [README.md](./README.md) - Full feature overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [API.md](./API.md) - Detailed API documentation
- [Tests](../__tests__/) - Test examples for all features

## 💬 Support

- Check `/api/health` for server status
- Review test files for usage examples
- Check logs: `npm run dev` shows detailed logs
- Common issues? See DEPLOYMENT.md troubleshooting section

## 🎉 You're Ready!

You now have a fully functional white-label barbershop SaaS platform!

**What to do next:**
1. Create organizations
2. Add shops
3. Invite team members
4. Setup billing
5. Track analytics
6. Deploy to production

---

**Need help?** Check the tests folder for complete examples of all features.
