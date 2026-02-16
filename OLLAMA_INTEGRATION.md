# 🤖 Local Ollama LLM Integration Guide

## Overview

ClawdBot and the barbershop SaaS application now use a **local Ollama LLM** instead of cloud APIs for complex reasoning tasks. This provides:

- **Better reasoning** for bot planning and multi-step tasks
- **Cost efficiency** (no cloud API costs for bot operations)
- **Privacy** (local processing, no external calls)
- **Speed** (local network latency vs internet round-trips)
- **Model separation** (reasoning vs user-facing)

## Architecture

### Model Mapping

```
┌─────────────────────────────────────┐
│    Local Ollama (192.168.50.80)     │
├─────────────────────────────────────┤
│ qwen2.5-coder:7b    (bot context)   │
│ phi4-mini:latest    (app context)   │
└─────────────────────────────────────┘
        │
        ├─ Bot Tasks
        │  (planning, reasoning,
        │   complex decisions)
        │
        └─ Customer-Facing
           (confirmations,
            fast responses)
```

### Context Types

| Context | Model | Latency | Use Case |
|---------|-------|---------|----------|
| **bot** | qwen2.5-coder:7b | 2-10s | Planning, reasoning, analysis, code generation |
| **app** | phi4-mini:latest | 1-3s | Customer confirmations, booking summaries |

## Configuration

### Environment Variables

```bash
# In .env
OLLAMA_BASE_URL=http://192.168.50.80:11434
```

This must be set for all bot tasks and sub-agent operations.

### Ollama Setup

```bash
# 1. Start Ollama server
ollama serve

# 2. Pull required models
ollama pull qwen2.5-coder:7b
ollama pull phi4-mini

# 3. Verify models are loaded
curl http://192.168.50.80:11434/api/tags
```

## Usage Guide

### Option 1: Low-Level (aiProvider)

Use `aiProvider` for full control over messages and model selection:

```typescript
import { aiProvider } from '@/lib/ai-provider'

// Use bot context (qwen2.5 - good for reasoning)
const response = await aiProvider.sendMessage(
  [
    { role: 'user', content: 'Analyze this problem and suggest solutions...' }
  ],
  'bot'  // ← Uses qwen2.5-coder:7b
)

console.log(response.text)
console.log(response.tokensUsed)  // For monitoring
```

### Option 2: High-Level (botAI Service)

Use `botAI` for structured task handling with automatic formatting:

```typescript
import { botAI } from '@/lib/bot-ai-service'

// Task processing
const result = await botAI.processTask({
  type: 'feature-analysis',
  description: 'Analyze this user feature request',
  context: { priority: 'high', estimatedEffort: 5 }
})

// Structured decisions
const decision = await botAI.makeDecision(
  'Should we add this feature?',
  [
    'Yes, high impact for users',
    'No, low ROI',
    'Maybe, requires more research'
  ],
  'Team bandwidth is low this quarter'
)

// Multi-step planning
const steps = await botAI.generatePlan(
  'Deploy new appointment system'
)

// Text analysis
const analysis = await botAI.analyze(
  userFeedbackText,
  'sentiment and feature requests'
)
```

## Real-World Examples

### Example 1: Bot Planning Task

```typescript
// ClawdBot needs to plan deployment steps
const steps = await botAI.generatePlan(
  'Migrate database with zero downtime',
  [
    'Production has 2000 active users',
    'Must not drop connections',
    'Limited maintenance window'
  ]
)

// Returns: ['Step 1: Create backup...', 'Step 2: Run migration...', ...]
```

### Example 2: Feature Prioritization

```typescript
// ClawdBot analyzes which feature to build
const decision = await botAI.makeDecision(
  'Which feature should we build next?',
  [
    'SMS reminders (2 days, high value)',
    'Gift cards (1 day, medium revenue)',
    'Staff scheduling (3 days, internal)'
  ],
  'Sprint is 2 weeks, focus on revenue'
)

// Returns structured decision with reasoning and confidence level
```

### Example 3: Feedback Analysis

```typescript
// ClawdBot analyzes user support tickets
const analysis = await botAI.analyze(
  supportTicketsText,
  'key pain points and feature gaps'
)

// Returns analysis with identified patterns and recommendations
```

### Example 4: Custom Complex Task

```typescript
// Use raw aiProvider for more control
const response = await aiProvider.sendMessage(
  [
    {
      role: 'user',
      content: 'Given our database is slow at peak hours, suggest optimization strategies'
    }
  ],
  'bot'
)
```

## Testing

### Run All Tests

```bash
# All tests (including Ollama tests)
npm test

# Specific test file
npm test -- bot-ai-service.test.ts

# Full integration test (if Ollama is running)
npx ts-node test-ollama-integration.ts
```

### Manual Verification

```bash
# Check Ollama is running
curl http://192.168.50.80:11434/api/tags

# Test a simple query
curl -X POST http://192.168.50.80:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

## Monitoring & Debugging

### Check Server Status

```typescript
import { aiProvider } from '@/lib/ai-provider'

const status = await aiProvider.getStatus()
console.log(status)
// {
//   ollamaUrl: 'http://192.168.50.80:11434',
//   alive: true,
//   loadedModels: ['qwen2.5-coder:7b', 'phi4-mini:latest'],
//   modelMap: { app: 'phi4-mini:latest', bot: 'qwen2.5-coder:7b' }
// }
```

### Monitor Token Usage

All responses include token counts:

```typescript
const response = await aiProvider.sendMessage(messages, 'bot')
console.log(`Tokens used: ${response.tokensUsed}`)
```

### Logs

Check logs for performance and errors:

```bash
# In application logs
LOG_LEVEL=debug npm run dev

# Look for: ai-provider: Local LLM message processed successfully
```

## Troubleshooting

### Issue: "Cannot connect to Ollama at http://192.168.50.80:11434"

**Solution:**
1. Verify Ollama is running: `curl http://192.168.50.80:11434/api/tags`
2. Check OLLAMA_BASE_URL in .env
3. Verify network connectivity: `ping 192.168.50.80`
4. Check Ollama logs for errors

### Issue: "Model not found: qwen2.5-coder:7b"

**Solution:**
```bash
# Pull the model
ollama pull qwen2.5-coder:7b

# Verify it's loaded
curl http://192.168.50.80:11434/api/tags
```

### Issue: Slow Response Times

**Possible causes:**
- Model is being unloaded from memory (cold start)
- Complex query requiring lots of reasoning
- Network latency to Ollama server
- System under heavy load

**Solutions:**
- Monitor with token counts
- Pre-warm models with simple queries
- Consider splitting complex tasks
- Check system resource usage on Ollama host

## Performance Expectations

| Scenario | Model | Latency | Notes |
|----------|-------|---------|-------|
| Simple reply | phi4-mini | 1-2s | Lightweight customer confirmations |
| Moderate reasoning | qwen2.5 | 3-5s | Planning, decisions |
| Complex analysis | qwen2.5 | 5-10s | Deep reasoning, multi-step problems |
| Cold start | Any | +5s | First query after idle time |

## Fallback Strategy

If Ollama becomes unavailable:

```typescript
try {
  const response = await aiProvider.sendMessage(messages, 'bot')
} catch (error) {
  logger.error('Ollama unavailable', error)
  // Fall back to placeholder or queue for retry
}
```

Note: Current implementation requires Ollama for bot tasks. Future enhancement: add cloud API fallback chain.

## Files Overview

### Core Files

- **lib/ai-provider.ts** — Low-level Ollama client with model mapping
- **lib/bot-ai-service.ts** — High-level service for structured bot tasks
- **lib/logger.ts** — Logging system with child logger support

### Test Files

- **__tests__/lib/ai-provider.test.ts** — aiProvider tests
- **__tests__/lib/bot-ai-service.test.ts** — botAI service tests
- **test-ollama-integration.ts** — Full integration test suite

### Examples

- **examples/bot-task-example.ts** — Real-world usage examples
- **OLLAMA_INTEGRATION.md** — This file

## Model Capabilities

### qwen2.5-coder:7b (Bot Context)

**Strengths:**
- Excellent code generation and analysis
- Strong multi-step reasoning
- Good problem decomposition
- Handles structured output well
- ~7B parameters = good reasoning at manageable size

**Best for:**
- Planning and task decomposition
- Code review and generation
- Complex decision making
- Detailed analysis

### phi4-mini (App Context)

**Strengths:**
- Fast inference (~1-2s)
- Small model size (lightweight)
- Good for simple tasks
- Efficient for high throughput

**Best for:**
- Appointment confirmations
- Quick summaries
- Customer-facing confirmations
- High-volume, simple queries

## Security Notes

- Local processing means no sensitive data leaves your network
- Ollama runs locally without authentication in this setup
- Consider securing Ollama endpoint if exposed beyond internal network
- Log all bot tasks for audit trail (tokens, prompts, responses)

## Next Steps

1. **Monitor in production** — Track response times, tokens, and failures
2. **Optimize prompts** — Refine prompts based on real usage patterns
3. **Consider caching** — Cache common bot queries to reduce latency
4. **Add metrics** — Set up alerts for slow responses or failures
5. **Evaluate models** — Periodically test newer/faster models

## References

- [Ollama Documentation](https://ollama.ai)
- [qwen2.5-coder Model Card](https://huggingface.co/Qwen/Qwen2.5-Coder-7B)
- [OpenAI API Compatibility](https://ollama.ai/blog/openai-compatibility)

---

**Last Updated:** 2026-02-15  
**Status:** ✅ Fully Integrated  
**Tested:** qwen2.5-coder:7b on Ollama 0.x
