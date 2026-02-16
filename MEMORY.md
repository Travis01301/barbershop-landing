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
- 2026-02-15: Local Ollama LLM integrated for bot reasoning and sub-agents

## Current Project: Barbershop SaaS MVP
**Status:** 248/256 tests passing (96.9%). MVP ready for Vercel deployment by Feb 14, 2026.

**What it is:** Production-ready appointment booking platform for barbershops with cancellation policies, SMS/email reminders, staff dashboards, customer CRM, and Stripe/Apple Pay payments.

**Why it matters:** High-ROI features built first (cancellation policies 1.33 ROI, SMS 0.875, availability calendar 0.50). Deployment strategy: Vercel MVP → Railway/K8s for scale.

**Tech:** Next.js 14, PostgreSQL, Stripe, Resend (email), Twilio (SMS), **Local Ollama for bot tasks**, OpenAI fallback.

**Architecture Highlights:**
- JWT + bcrypt authentication (A+ security scorecard)
- Hourly cron job for 24h appointment reminders
- **Local LLM** (qwen2.5-coder:7b) for bot reasoning and sub-agent planning
- **Fast LLM** (phi4-mini) for customer-facing confirmations
- Connection pooling for production-ready database layer
- Rate limiting + token blacklisting (logout security)
- 25+ API endpoints across auth, payments, appointments, barber/customer management

---

## 🤖 Local LLM Integration (Ollama)

### What Changed
- Moved bot reasoning from cloud APIs to **local qwen2.5-coder:7b** on 192.168.50.80:11434
- Keeps customer-facing responses lightweight with **phi4-mini** for fast confirmations
- Better separation: reasoning (bot) vs user-facing (app)

### Configuration
```
OLLAMA_BASE_URL=http://192.168.50.80:11434
```

**Models:**
- `bot` context → `qwen2.5-coder:7b` (complex reasoning, planning, analysis)
- `app` context → `phi4-mini:latest` (booking confirmations, customer emails)

### How to Use

#### In Bot Handlers & Sub-Agents (Complex Tasks)
```typescript
import { aiProvider } from '@/lib/ai-provider'

// Option 1: Simple message (defaults to 'bot' context)
const response = await aiProvider.sendMessage([
  { role: 'user', content: 'Analyze this complex problem...' }
])

// Option 2: Explicit bot context
const response = await aiProvider.sendMessage(
  [{ role: 'user', content: 'Plan the next steps...' }],
  'bot'  // ← Uses qwen2.5-coder:7b
)
```

#### In Bot AI Service (Structured Tasks)
```typescript
import { botAI } from '@/lib/bot-ai-service'

// Task processing with reasoning
const result = await botAI.processTask({
  type: 'planning',
  description: 'Generate deployment steps',
  context: { environment: 'production' }
})

// Structured decisions
const decision = await botAI.makeDecision(
  'Which feature to build first?',
  ['Feature A', 'Feature B', 'Feature C'],
  'Team has 2 weeks'
)

// Multi-step planning
const steps = await botAI.generatePlan(
  'Deploy to production',
  ['No downtime', 'Needs approval']
)

// Text analysis
const analysis = await botAI.analyze(
  userFeedback,
  'sentiment and feature requests'
)
```

#### In Customer-Facing Code (Fast Confirmations)
```typescript
// Uses 'app' context → phi4 (faster, lighter)
const response = await aiProvider.sendMessage(
  [{ role: 'user', content: 'Confirm this appointment...' }],
  'app'  // ← Uses phi4-mini
)
```

### When to Use Which Context
| Context | Model | Use Case |
|---------|-------|----------|
| `bot` | qwen2.5-coder:7b | Bot reasoning, planning, complex decisions, code analysis, sub-agent tasks |
| `app` | phi4-mini:latest | Customer confirmations, booking summaries, fast email templates |

### Testing
```bash
# Run all integration tests
npm test

# Test Ollama specifically (requires server running)
npx ts-node test-ollama-integration.ts

# Test bot AI service (requires Ollama + models)
npm test -- bot-ai-service.test.ts
```

### Files Created
- `lib/bot-ai-service.ts` — Bot reasoning service (task processing, decisions, planning, analysis)
- `__tests__/lib/bot-ai-service.test.ts` — Bot AI tests
- `test-ollama-integration.ts` — Full integration test suite

### Quality Notes
- qwen2.5-coder:7b excels at reasoning, code analysis, and structured thinking
- Response time depends on query complexity (typically 2-10 seconds for complex tasks)
- Falls back gracefully if Ollama is unavailable (check logs)
- All responses are logged with token counts for monitoring

### Next Steps
1. Monitor qwen2.5 response times in production
2. Consider model switching if phi4 proves insufficient for customer-facing tasks
3. Add caching for common bot queries to reduce latency
4. Document any learnings from production deployment

**Key Decision:** Using local LLM preserves privacy, reduces cloud API costs, and gives bot/sub-agents access to powerful reasoning without customer-facing latency.
