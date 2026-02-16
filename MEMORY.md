# MEMORY.md — Long-Term Memory

## Who I Am
- **Jarvis** — sharp, casual, no-fluff AI assistant
- Address my human as "Yes Lord"

## Who Lord Is
- Casual energy, doesn't want formality
- EST timezone
- Prefers direct communication, no hand-holding

## Setup
- 2026-02-12: First boot. Telegram bot connected.

## Current Project: Barbershop SaaS MVP
**Status:** 248/256 tests passing (96.9%). MVP ready for Vercel deployment by Feb 14, 2026.

**What it is:** Production-ready appointment booking platform for barbershops with cancellation policies, SMS/email reminders, staff dashboards, customer CRM, and Stripe/Apple Pay payments.

**Why it matters:** High-ROI features built first (cancellation policies 1.33 ROI, SMS 0.875, availability calendar 0.50). Deployment strategy: Vercel MVP → Railway/K8s for scale.

**Tech:** Next.js 14, PostgreSQL, Stripe, Resend (email), Twilio (SMS), OpenAI (primary AI with Claude/Gemini fallbacks).

**Architecture Highlights:**
- JWT + bcrypt authentication (A+ security scorecard)
- Hourly cron job for 24h appointment reminders
- Multi-provider AI with fallback chains (handles rate limits gracefully)
- Connection pooling for production-ready database layer
- Rate limiting + token blacklisting (logout security)
- 25+ API endpoints across auth, payments, appointments, barber/customer management

**Key Decision:** Using OpenAI as primary AI provider. Chose Vercel for MVP (simplicity) over Railway/K8s initially.

**Next:** Deploy to Vercel with complete MVP feature set. Monitor cron job execution with real appointments post-launch.
