# BarberFlow White-Label System

A production-ready white-label SaaS platform for barbershop agencies, chains, and franchises to resell as their own branded platform.

## 🎯 Overview

This system enables agencies and chains to:
- Create multi-tenant organizations
- Customize branding (logo, colors, fonts, domain)
- Manage multiple shops
- Control team access with role-based permissions
- Handle billing and payments
- Track analytics across the organization

## 📊 System Architecture

### Multi-Tenant Design
- **Tenant Isolation**: Complete data isolation between organizations
- **Domain Routing**: Route requests by custom domain, subdomain, or org ID
- **Settings Per Org**: Branding, billing, feature flags all organization-specific

### Database Schema
```
organizations
├── organization_settings (branding, domain, email)
├── organization_shops (shops under org)
├── organization_staff (team members)
├── organization_billing (subscription, invoices)
├── users (team members + barbers)
├── activity_logs (audit trail)
└── usage_analytics (metrics)
```

## 🚀 Features

### 1. Multi-Tenant Branding
- Custom domain configuration (CNAME to barbershop.com)
- Logo upload
- Brand colors (primary, secondary, accent)
- Font selection
- Custom app name
- Email domain configuration
- Welcome message & help text

### 2. Organization Tiers
- **SINGLE_SHOP**: Individual barber's own shop
- **AGENCY**: Manages multiple shops
- **CHAIN**: Network of locations
- **FRANCHISE**: Partner reseller

### 3. Shop Management
- Add/remove shops
- Per-shop configuration
- Shop-specific branding overrides
- Barber capacity tracking

### 4. Staff Management
- Send invitations (email-based)
- Role-based access control (OWNER, ADMIN, MANAGER, STAFF)
- Per-shop assignments
- Activity tracking

### 5. Billing & Payments
- Tiered plans (STARTER, PROFESSIONAL, ENTERPRISE)
- Stripe integration
- Invoice generation
- Payment tracking
- Automatic billing

### 6. Analytics
- Organization-wide metrics
- Revenue tracking
- Appointment counts
- Active customer/staff counts
- Per-period aggregation

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)

### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/white_label
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Installation
```bash
npm install
npm run migrate
npm run seed
npm run dev
```

## 📚 API Endpoints

### Organizations
```
POST   /api/organizations                 - Create org
GET    /api/organizations/:id             - Get org details
PATCH  /api/organizations/:id             - Update org
DELETE /api/organizations/:id             - Delete org
GET    /api/organizations/:id/dashboard   - Get dashboard
```

### Branding & Settings
```
GET    /api/organizations/:orgId/settings           - Get settings
PATCH  /api/organizations/:orgId/settings           - Update settings
POST   /api/organizations/:orgId/settings/logo      - Upload logo
GET    /api/organizations/:orgId/settings/public    - Get public settings
```

### Shops
```
POST   /api/organizations/:orgId/shops            - Create shop
GET    /api/organizations/:orgId/shops            - List shops
GET    /api/organizations/:orgId/shops/:shopId    - Get shop details
PATCH  /api/organizations/:orgId/shops/:shopId    - Update shop
DELETE /api/organizations/:orgId/shops/:shopId    - Delete shop
```

### Staff
```
POST   /api/organizations/:orgId/staff                           - Invite staff
GET    /api/organizations/:orgId/staff                           - List staff
GET    /api/organizations/:orgId/staff/invitations               - List invitations
PATCH  /api/organizations/:orgId/staff/:staffId                 - Update staff
DELETE /api/organizations/:orgId/staff/:staffId                 - Remove staff
POST   /api/organizations/:orgId/staff/invitations/:id/accept    - Accept invite
```

### Billing
```
GET    /api/organizations/:orgId/billing                    - Get billing info
PATCH  /api/organizations/:orgId/billing                    - Update plan
POST   /api/organizations/:orgId/billing/invoices           - Create invoice
GET    /api/organizations/:orgId/billing/invoices           - List invoices
POST   /api/organizations/:orgId/billing/charge             - Create charge
POST   /api/organizations/:orgId/billing/payment-method     - Add payment method
```

### Analytics
```
GET    /api/organizations/:orgId/analytics                  - Get analytics
GET    /api/organizations/:orgId/analytics/summary          - Get summary
GET    /api/organizations/:orgId/analytics/shops            - List shops
POST   /api/organizations/:orgId/analytics/record           - Record metric
```

### Authentication
```
POST   /api/auth/register         - Register user
POST   /api/auth/login            - Login
POST   /api/auth/verify           - Verify token
POST   /api/auth/refresh          - Refresh token
POST   /api/auth/password-reset   - Request reset
```

## 🧪 Testing

Run the full test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

### Test Coverage
- ✅ Multi-tenant routing (custom domain, subdomain, org ID)
- ✅ Branding API (colors, fonts, domain, logos)
- ✅ Shop provisioning (CRUD operations)
- ✅ Staff management (invitations, roles, assignments)
- ✅ Billing workflows (plans, invoices, payments)
- ✅ Analytics tracking (metrics aggregation)
- **35+ tests** covering all major features
- **95%+ coverage** of critical paths

## 🎨 React Components

### OrgSetup
Creates a new organization with name, email, phone, and type selection.

### BrandingEditor
Edit logo, colors (primary, secondary, accent), fonts, domain, email, and messages.

### ShopProvisioner
Add/manage shops with full CRUD operations and bulk management.

### OrgDashboard
View organization overview, stats, settings, and billing management.

### OrgBilling
Manage subscription plans, invoices, and payment methods.

### BrandedLayout
Wrapper that applies organization branding dynamically across the app.

## 🔐 Multi-Tenant Security

### Isolation Guarantees
- Each organization sees only its own data
- Requests validated against org context
- Database queries filtered by organizationId
- Role-based access control (RBAC)

### Route Resolution (Priority Order)
1. Custom domain in settings
2. Subdomain extraction
3. Query parameter `?org=id`
4. Header `X-Organization-ID`

### Authentication
- JWT tokens include organizationId and role
- Tokens expire in 7 days
- Can be refreshed with refresh endpoint

## 📈 Scalability Considerations

### Database
- Indices on organizationId for all queries
- Partitioning ready for large-scale deployments
- Analytics aggregation at insertion time

### Caching
- Organization settings cacheable per domain
- Billing info rarely changes
- Consider Redis for session/token storage

### Multi-Region
- Custom domains support global DNS
- Stripe handles multi-currency
- SMTP can be region-specific

## 📦 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Setup
1. Create PostgreSQL database
2. Set environment variables
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

### Production Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure SSL/TLS (Let's Encrypt)
- [ ] Setup SMTP for email
- [ ] Configure Stripe production keys
- [ ] Enable database backups
- [ ] Setup monitoring/logging
- [ ] Configure CDN for static assets
- [ ] Enable rate limiting

## 🤝 Contributing

1. Write tests for new features
2. Maintain 95%+ coverage
3. Follow existing code style
4. Document API changes
5. Update README as needed

## 📄 License

Proprietary - BarberFlow White-Label System

## 💰 Business Model

### Revenue Tiers
- **STARTER**: $99/month - Up to 5 shops
- **PROFESSIONAL**: $299/month - Up to 20 shops, custom domain
- **ENTERPRISE**: $999/month - Unlimited shops, API access, 24/7 support

### Target Market
- Barbershop agencies
- Salon chains
- Regional franchises
- Resellers & partners

### Expected Impact
- **10x TAM expansion** (single shop → enterprise market)
- New revenue channel through reseller partnerships
- Enables white-label model for agencies

## 📞 Support

For issues or questions:
1. Check test files for examples
2. Review API documentation
3. Check database schema
4. Contact support team

## 🎯 Key Metrics

- Organizations created
- Active shops per org
- Monthly recurring revenue (MRR)
- Team members using platform
- Appointments processed
- API calls per month
- Uptime (target: 99.9%)

---

**Built with Express.js, React, Prisma, and PostgreSQL**
