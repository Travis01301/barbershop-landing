# Barbershop Booking - Improvement Plan

## 🔴 CRITICAL (Security/Breaking)

### 1. **Database Credentials Hardcoded**
**Location:** `app/api/payments/intent/route.ts` + likely all API routes
**Issue:** Database password hardcoded as `'your_secure_password_here'`
**Fix:** 
- Move all DB config to `.env.local`
- Create `lib/db.ts` with a single Pool instance
- Use connection pooling across all routes
- Remove hardcoded credentials completely

**Impact:** Security vulnerability, prevents deployment

### 2. **Missing Environment Variables**
**Missing:**
- `.env.local` file (should have: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `JWT_SECRET`, `RESEND_API_KEY`)
- No validation that env vars exist at startup

**Fix:**
- Create `.env.example` with all required vars
- Add startup check in middleware
- Handle graceful errors if env vars missing

---

## 🟠 HIGH PRIORITY (Functionality/Reliability)

### 3. **No Error Handling on API Routes**
**Issues:**
- Generic 500 errors (no logging/debugging info)
- SQL errors leak details to client
- No input validation/sanitization
- Missing try-catch in some endpoints

**Fix:**
- Create `lib/errors.ts` with custom error classes
- Implement centralized error handler
- Sanitize all inputs
- Log errors to file/monitoring service

### 4. **Database Connection Issues**
**Issues:**
- New Pool() created in every route (connection leak)
- No connection pooling across routes
- No timeout handling

**Fix:**
- Create singleton Pool in `lib/db.ts`
- Reuse across all routes
- Add connection timeout handlers
- Add health check endpoint

### 5. **Missing Input Validation**
**Locations:** All API routes
**Issues:**
- No validation on POST payloads
- No rate limiting
- No CSRF protection
- Email validation is weak

**Fix:**
- Use `zod` for schema validation
- Add validation middleware
- Implement rate limiting (Redis or simple in-memory)
- Add CSRF tokens for form submissions

### 6. **No Tests**
**Issues:**
- Zero test coverage
- Manual testing required
- High risk of regressions

**Fix:**
- Add Jest + React Testing Library
- Start with API route tests
- Add component tests for critical UI
- Aim for 60%+ coverage on happy paths

---

## 🟡 MEDIUM PRIORITY (Code Quality)

### 7. **No Logging/Monitoring**
**Issues:**
- No request/response logging
- Silent failures
- Can't debug production issues

**Fix:**
- Add structured logging (`winston` or `pino`)
- Log all API calls, errors, warnings
- Include request IDs for tracing

### 8. **TypeScript Issues**
**Issues:**
- Lots of `any` types
- Missing prop types on components
- No strict mode enabled

**Fix:**
- Enable `strict: true` in tsconfig.json
- Replace all `any` types with proper interfaces
- Export types from components

### 9. **No API Documentation**
**Issues:**
- Endpoints not documented
- Unclear request/response formats
- New devs have to reverse-engineer

**Fix:**
- Add OpenAPI/Swagger docs
- Generate from code comments
- Add to `/api/docs`

### 10. **Duplicated Code**
**Issues:**
- Database queries duplicated across routes
- Error handling patterns repeated
- API response format inconsistent

**Fix:**
- Create `lib/queries.ts` with reusable DB queries
- Create response wrapper function
- Use consistent error format

---

## 🟢 LOW PRIORITY (Nice-to-Have)

### 11. **Performance**
**Ideas:**
- Add caching layer (Redis) for barber schedules
- Cache available slots for 5 minutes
- Add database indexes on frequently queried columns
- Implement pagination for customer/appointment lists

### 12. **Frontend Improvements**
**Ideas:**
- Add loading spinners (currently just states)
- Better error messages to users
- Form validation feedback (real-time)
- Accessible form labels (a11y)
- Mobile responsiveness testing

### 13. **DevOps/Deployment**
**Ideas:**
- Docker setup for local dev
- GitHub Actions for CI/CD
- Database migration scripts
- Deployment guide

### 14. **Documentation**
**Ideas:**
- Architecture diagram
- Database schema diagram
- Setup guide for new devs
- API endpoint reference

---

## 📊 Implementation Order

**Week 1 (Critical):**
1. Environment variables + .env.example
2. Centralize database connections
3. Basic input validation

**Week 2 (High):**
4. Error handling + logging
5. Rate limiting
6. Basic tests (API routes)

**Week 3 (Medium):**
7. TypeScript strict mode fixes
8. API documentation
9. Code cleanup (reduce duplication)

**Later:**
10-14. Performance, frontend polish, DevOps, docs

---

## 💡 Quick Wins (Easy, High Value)

- [ ] Create `.env.example` (5 min)
- [ ] Create `lib/db.ts` to centralize connections (15 min)
- [ ] Add JSDoc comments to all API routes (20 min)
- [ ] Enable `strict: true` in TypeScript (30 min, will need fixes)
- [ ] Add basic input validation to payment route (15 min)

**Total: ~1.5 hours for quick wins**

---

## Questions for You

1. **Deployment target?** (Vercel, self-hosted, etc.)
2. **Database:** Is PostgreSQL set up locally? Remote?
3. **Testing:** How much coverage do you want?
4. **Timeline:** When do you need this production-ready?
5. **Stripe:** Is API key configured?

---

## Next Steps

Let me know which areas you want to tackle first, and I'll:
1. Create the utility files (db.ts, errors.ts, validation.ts)
2. Update API routes to use them
3. Add tests
4. Document the changes

**Ready to start?**
