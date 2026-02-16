/**
 * Example: How ClawdBot uses local qwen2.5-coder:7b for complex tasks
 * This demonstrates real-world bot reasoning scenarios
 */

import { botAI } from '@/lib/bot-ai-service'
import { aiProvider } from '@/lib/ai-provider'

/**
 * Example 1: Planning a deployment
 * ClawdBot needs to reason through deployment steps
 */
async function exampleDeploymentPlanning() {
  console.log('📋 Example 1: Deployment Planning')
  console.log('=' .repeat(60))

  try {
    const steps = await botAI.generatePlan(
      'Deploy the barbershop SaaS to production with zero downtime',
      [
        'Current system has 2000 active users',
        'Database must be migrated',
        'API endpoints cannot be interrupted',
        'Requires 2-person approval process'
      ]
    )

    console.log('Generated plan:')
    steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step}`)
    })

    console.log()
  } catch (error) {
    console.error('Deployment planning failed:', error)
  }
}

/**
 * Example 2: Decision making for feature prioritization
 * ClawdBot analyzes tradeoffs and makes recommendations
 */
async function exampleFeaturePrioritization() {
  console.log('🎯 Example 2: Feature Prioritization Decision')
  console.log('=' .repeat(60))

  try {
    const decision = await botAI.makeDecision(
      'Which feature should we implement in the next sprint?',
      [
        'SMS reminders for appointments (2-3 days effort, high user value)',
        'Gift card system (1-2 days effort, medium revenue impact)',
        'Staff scheduling dashboard (3-4 days effort, internal tool)'
      ],
      'Sprint is 2 weeks, team has 5 people, focusing on revenue growth'
    )

    console.log('Decision Analysis:')
    console.log(`Recommendation: ${decision.action}`)
    console.log(`Confidence: ${decision.confidence}`)
    console.log(`Reasoning: ${decision.reasoning}`)
    if (decision.details) {
      console.log(`Additional details: ${JSON.stringify(decision.details, null, 2)}`)
    }

    console.log()
  } catch (error) {
    console.error('Feature prioritization failed:', error)
  }
}

/**
 * Example 3: Analyzing user feedback
 * ClawdBot extracts patterns and insights
 */
async function exampleFeedbackAnalysis() {
  console.log('🔍 Example 3: User Feedback Analysis')
  console.log('=' .repeat(60))

  const userFeedback = `
    User feedback from support tickets:
    1. "Booking is easy but I can't see all barbers at once"
    2. "Would be great if I could cancel within 24h without penalty"
    3. "Payment system is secure, good job"
    4. "Need reminder before my appointment"
    5. "Cancellation process is confusing, took 5 clicks"
    6. "Can't modify appointment time after booking"
  `

  try {
    const analysis = await botAI.analyze(
      userFeedback,
      'key pain points, feature gaps, and sentiment'
    )

    console.log('Feedback Analysis Results:')
    console.log(analysis)

    console.log()
  } catch (error) {
    console.error('Feedback analysis failed:', error)
  }
}

/**
 * Example 4: Complex task processing
 * ClawdBot reasons through multi-step problems
 */
async function exampleComplexReasoning() {
  console.log('🧠 Example 4: Complex Problem Solving')
  console.log('=' .repeat(60))

  try {
    const result = await botAI.processTask({
      type: 'database-optimization',
      description: 'The barbershop booking system is slow during peak hours (3-6pm). Appointments query takes 500ms. How would you optimize it?',
      context: {
        currentArchitecture: 'PostgreSQL with 50k appointments',
        userConcurrency: 500,
        queryType: 'List available slots',
        responseTimeTarget: '< 100ms'
      }
    })

    console.log('Optimization Analysis:')
    console.log(result)

    console.log()
  } catch (error) {
    console.error('Complex reasoning failed:', error)
  }
}

/**
 * Example 5: Using raw aiProvider for custom prompts
 * More direct control when botAI service isn't suitable
 */
async function exampleCustomPrompt() {
  console.log('✏️ Example 5: Custom Prompt via aiProvider')
  console.log('=' .repeat(60))

  try {
    const response = await aiProvider.sendMessage(
      [
        {
          role: 'user',
          content: `You are a barbershop management expert. 
          
Our barbers are complaining about:
1. Too many no-shows (25% of bookings)
2. Tight scheduling (back-to-back appointments)
3. Uneven workload (some days 80% booked, some days 30%)

Suggest 3 specific, implementable solutions that improve both customer experience and barber satisfaction.`
        }
      ],
      'bot' // ← Explicit 'bot' context uses qwen2.5-coder:7b
    )

    console.log('Expert Recommendations:')
    console.log(response.text)
    console.log(`\nModel: ${response.model} | Tokens: ${response.tokensUsed || 'unknown'}`)

    console.log()
  } catch (error) {
    console.error('Custom prompt failed:', error)
  }
}

/**
 * Main: Run all examples
 */
async function main() {
  console.log('\n')
  console.log('🤖 ClawdBot Examples - Local qwen2.5-coder:7b')
  console.log('=' .repeat(60))
  console.log()

  // Check if Ollama is available
  const status = await aiProvider.getStatus()
  console.log(`Server Status: ${status.alive ? '✅ Running' : '❌ Unavailable'}`)
  console.log(`URL: ${status.ollamaUrl}`)
  if (status.loadedModels.length > 0) {
    console.log(`Loaded models: ${status.loadedModels.join(', ')}`)
  }
  console.log()

  if (!status.alive) {
    console.log('⚠️  Ollama server not responding. These examples require:')
    console.log('   - Ollama running at ' + status.ollamaUrl)
    console.log('   - qwen2.5-coder:7b model loaded')
    console.log('   - phi4-mini:latest model loaded')
    console.log()
    console.log('Start Ollama with: ollama serve')
    console.log('Pull models: ollama pull qwen2.5-coder:7b')
    process.exit(1)
  }

  // Run examples
  await exampleDeploymentPlanning()
  await exampleFeaturePrioritization()
  await exampleFeedbackAnalysis()
  await exampleComplexReasoning()
  await exampleCustomPrompt()

  console.log('✅ All examples completed')
  console.log()
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
