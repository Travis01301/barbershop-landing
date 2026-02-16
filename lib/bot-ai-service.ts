/**
 * Bot AI Service - Uses qwen2.5-coder:7b for complex bot reasoning tasks
 * This service handles planning, multi-step reasoning, and complex decisions
 */

import { aiProvider, AIMessage } from './ai-provider'
import { logger } from './logger'

const botLogger = logger.createChild('bot-ai')

export interface BotTask {
  type: string
  description: string
  context?: Record<string, any>
}

export interface BotDecision {
  reasoning: string
  action: string
  confidence: 'high' | 'medium' | 'low'
  details?: Record<string, any>
}

/**
 * Bot AI Service using local qwen2.5-coder:7b
 * Good for:
 * - Multi-step reasoning and planning
 * - Complex decision making
 * - Code generation and analysis
 * - Structured problem solving
 */
class BotAIService {
  /**
   * Process a complex task requiring reasoning
   * Uses qwen2.5-coder:7b via 'bot' context
   */
  async processTask(task: BotTask): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Task: ${task.type}\nDescription: ${task.description}\n${
          task.context ? `Context: ${JSON.stringify(task.context, null, 2)}` : ''
        }\n\nProvide a structured response with clear reasoning.`
      }
    ]

    try {
      botLogger.debug('Processing bot task', { type: task.type })
      
      const response = await aiProvider.sendMessage(messages, 'bot')
      
      botLogger.info('Bot task completed', {
        type: task.type,
        responseLength: response.text.length,
        tokensUsed: response.tokensUsed
      })

      return response.text
    } catch (error) {
      botLogger.error('Bot task failed', error, { type: task.type })
      throw error
    }
  }

  /**
   * Get a structured decision from the bot
   * Useful for planning and decision making
   */
  async makeDecision(
    question: string,
    options: string[],
    context?: string
  ): Promise<BotDecision> {
    const prompt = `
You are a decision-making assistant. Analyze the following and provide a structured decision.

Question: ${question}

Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

${context ? `Context: ${context}` : ''}

Respond with:
REASONING: [Your step-by-step reasoning]
ACTION: [Your recommended action/option]
CONFIDENCE: [high/medium/low]
DETAILS: [Any additional relevant details in JSON format]
`

    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ]

    try {
      botLogger.debug('Making bot decision', { question })
      
      const response = await aiProvider.sendMessage(messages, 'bot')
      const decision = this.parseDecision(response.text)
      
      botLogger.info('Decision made', { question, confidence: decision.confidence })
      
      return decision
    } catch (error) {
      botLogger.error('Decision making failed', error, { question })
      throw error
    }
  }

  /**
   * Parse a decision response into structured format
   */
  private parseDecision(text: string): BotDecision {
    const lines = text.split('\n')
    const decision: BotDecision = {
      reasoning: '',
      action: '',
      confidence: 'medium'
    }

    for (const line of lines) {
      if (line.startsWith('REASONING:')) {
        decision.reasoning = line.replace('REASONING:', '').trim()
      } else if (line.startsWith('ACTION:')) {
        decision.action = line.replace('ACTION:', '').trim()
      } else if (line.startsWith('CONFIDENCE:')) {
        const conf = line.replace('CONFIDENCE:', '').trim().toLowerCase()
        if (conf === 'high' || conf === 'medium' || conf === 'low') {
          decision.confidence = conf
        }
      } else if (line.startsWith('DETAILS:')) {
        try {
          const detailsStr = line.replace('DETAILS:', '').trim()
          decision.details = JSON.parse(detailsStr)
        } catch {
          // If not valid JSON, store as string
          decision.details = { raw: line }
        }
      }
    }

    return decision
  }

  /**
   * Generate a plan for a multi-step task
   * Good for organizing complex workflows
   */
  async generatePlan(objective: string, constraints?: string[]): Promise<string[]> {
    const constraintText = constraints
      ? `Constraints:\n${constraints.map(c => `- ${c}`).join('\n')}`
      : ''

    const prompt = `
Create a step-by-step plan to accomplish the following objective:

Objective: ${objective}

${constraintText}

Provide the plan as a numbered list with clear, actionable steps. Each step should be concise and specific.
`

    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ]

    try {
      botLogger.debug('Generating plan', { objective })
      
      const response = await aiProvider.sendMessage(messages, 'bot')
      const steps = this.extractPlanSteps(response.text)
      
      botLogger.info('Plan generated', { objective, stepCount: steps.length })
      
      return steps
    } catch (error) {
      botLogger.error('Plan generation failed', error, { objective })
      throw error
    }
  }

  /**
   * Extract numbered steps from a plan response
   */
  private extractPlanSteps(text: string): string[] {
    const lines = text.split('\n')
    const steps: string[] = []

    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+)$/)
      if (match) {
        steps.push(match[1].trim())
      }
    }

    return steps.length > 0
      ? steps
      : [text] // Fallback: return whole response as single step
  }

  /**
   * Analyze text for patterns or insights
   * Good for understanding user intent or technical problems
   */
  async analyze(text: string, analysisType: string): Promise<string> {
    const prompt = `
Analyze the following text for ${analysisType}:

Text:
${text}

Provide a clear, structured analysis focusing on:
1. Key findings
2. Patterns or themes
3. Recommendations or insights
`

    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ]

    try {
      botLogger.debug('Starting analysis', { analysisType })
      
      const response = await aiProvider.sendMessage(messages, 'bot')
      
      botLogger.info('Analysis complete', {
        analysisType,
        responseLength: response.text.length
      })
      
      return response.text
    } catch (error) {
      botLogger.error('Analysis failed', error, { analysisType })
      throw error
    }
  }
}

// Export singleton instance
export const botAI = new BotAIService()

export default botAI
