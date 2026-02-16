#!/usr/bin/env node
/**
 * Test script for Ollama + qwen2.5-coder:7b integration
 * Run with: npx ts-node test-ollama-integration.ts
 * Or after compilation: node dist/test-ollama-integration.js
 */

import { aiProvider } from './lib/ai-provider'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test 1: Check server status
  console.log('\n🔍 Test 1: Ollama Server Status')
  let startTime = Date.now()
  try {
    const status = await aiProvider.getStatus()
    const duration = Date.now() - startTime

    console.log(`✅ Server status retrieved (${duration}ms)`)
    console.log(`   URL: ${status.ollamaUrl}`)
    console.log(`   Alive: ${status.alive}`)
    console.log(`   Loaded models: ${status.loadedModels.join(', ')}`)
    console.log(`   Model map: ${JSON.stringify(status.modelMap)}`)

    results.push({
      name: 'Server Status',
      passed: status.alive,
      duration,
      error: status.alive ? undefined : 'Ollama server not responding'
    })

    if (!status.alive) {
      console.log('\n⚠️  Ollama server is not responding. Skipping remaining tests.')
      console.log('   Make sure Ollama is running at:', status.ollamaUrl)
      return results
    }
  } catch (error) {
    console.error('❌ Failed to get server status:', error)
    results.push({
      name: 'Server Status',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error)
    })
    return results
  }

  // Test 2: Test bot context (qwen2.5-coder:7b)
  console.log('\n🔍 Test 2: Bot Context (qwen2.5-coder:7b)')
  startTime = Date.now()
  try {
    const response = await aiProvider.sendMessage(
      [
        {
          role: 'user',
          content: 'You are a helpful assistant. What is 2 + 2? Answer in one sentence.'
        }
      ],
      'bot'
    )
    const duration = Date.now() - startTime

    console.log(`✅ Bot context query successful (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Provider: ${response.provider}`)
    console.log(`   Tokens: ${response.tokensUsed || 'unknown'}`)
    console.log(`   Response: "${response.text.substring(0, 100)}..."`)

    results.push({
      name: 'Bot Context (qwen2.5)',
      passed: response.provider === 'local' && response.text.length > 0,
      duration,
      error: !response.text ? 'Empty response' : undefined
    })
  } catch (error) {
    console.error('❌ Bot context test failed:', error)
    results.push({
      name: 'Bot Context (qwen2.5)',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error)
    })
  }

  // Test 3: Test complex reasoning task (good for qwen2.5)
  console.log('\n🔍 Test 3: Complex Reasoning (Bot Task)')
  startTime = Date.now()
  try {
    const response = await aiProvider.sendMessage(
      [
        {
          role: 'user',
          content: `I have 3 apples. I give 2 to my friend. Then my mom gives me 5 more. How many apples do I have now? 
          
Please explain your reasoning step by step.`
        }
      ],
      'bot'
    )
    const duration = Date.now() - startTime

    console.log(`✅ Complex reasoning task successful (${duration}ms)`)
    console.log(`   Tokens: ${response.tokensUsed || 'unknown'}`)
    console.log(`   Response preview:`)
    response.text.split('\n').slice(0, 3).forEach(line => {
      if (line.trim()) console.log(`     ${line}`)
    })

    results.push({
      name: 'Complex Reasoning',
      passed: response.text.length > 50,
      duration,
      error: response.text.length < 50 ? 'Response too short' : undefined
    })
  } catch (error) {
    console.error('❌ Complex reasoning test failed:', error)
    results.push({
      name: 'Complex Reasoning',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error)
    })
  }

  // Test 4: Performance benchmark (multiple rapid requests)
  console.log('\n🔍 Test 4: Performance Benchmark')
  startTime = Date.now()
  try {
    const testMessage = [
      { role: 'user', content: 'Hello, how are you?' }
    ]
    
    const timings: number[] = []
    for (let i = 0; i < 3; i++) {
      const reqStart = Date.now()
      await aiProvider.sendMessage(testMessage, 'bot')
      timings.push(Date.now() - reqStart)
    }
    
    const duration = Date.now() - startTime
    const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length)

    console.log(`✅ Benchmark complete (${duration}ms total)`)
    console.log(`   Individual request times: ${timings.map(t => t + 'ms').join(', ')}`)
    console.log(`   Average: ${avgTime}ms per request`)

    results.push({
      name: 'Performance Benchmark',
      passed: avgTime < 30000, // Should respond within 30s
      duration,
      error: avgTime >= 30000 ? `Slow response time: ${avgTime}ms` : undefined
    })
  } catch (error) {
    console.error('❌ Performance benchmark failed:', error)
    results.push({
      name: 'Performance Benchmark',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error)
    })
  }

  return results
}

async function main() {
  console.log('=' .repeat(60))
  console.log('🧪 Ollama + qwen2.5-coder:7b Integration Tests')
  console.log('=' .repeat(60))

  const results = await runTests()

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 Test Summary')
  console.log('=' .repeat(60))

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name.padEnd(30)} - ${result.duration}ms`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })

  console.log('\n' + '-'.repeat(60))
  console.log(`Results: ${passed}/${total} tests passed`)
  console.log('=' .repeat(60) + '\n')

  process.exit(passed === total ? 0 : 1)
}

main().catch(error => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
