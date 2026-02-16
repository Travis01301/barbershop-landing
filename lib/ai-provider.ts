import { logger } from './logger'

export type AIProvider = 'phi4' | 'qwen2.5' | 'local' | 'deepseek'
export type ModelContext = 'app' | 'bot'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  provider: AIProvider
  model: string
  tokensUsed?: number
}

const aiLogger = logger.createChild('ai-provider')

/**
 * AI Provider with fallback chain:
 * 1. Local Ollama (phi4/qwen2.5) - zero cost, no rate limits
 * 2. DeepSeek API - fallback if Ollama unavailable
 * 
 * phi4 (fast) → barbershop app (customer-facing)
 * qwen2.5 (reasoning) → bot & sub-agents (complex tasks)
 */
class AIProviderService {
  private getOllamaUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  private getDeepSeekApiKey(): string {
    return process.env.DEEPSEEK_API_KEY || ''
  }
  
  // Model mapping by context
  private modelMap: Record<ModelContext, string> = {
    app: 'phi4-mini:latest',        // Fast, lightweight for booking confirmations
    bot: 'qwen2.5-coder:7b',        // Better reasoning for bot tasks & sub-agents
  }

  // DeepSeek model mapping
  private deepseekModelMap: Record<ModelContext, string> = {
    app: 'deepseek-chat',           // Fast, lightweight for app
    bot: 'deepseek-chat',           // Uses reasoning tokens for complex tasks
  }

  /**
   * Send a message and get AI response with fallback chain
   * Tries Ollama first (local, free), falls back to DeepSeek if needed
   * @param messages - Chat history
   * @param context - Use case: 'app' (phi4) or 'bot' (qwen2.5)
   */
  async sendMessage(
    messages: AIMessage[],
    context: ModelContext = 'bot'
  ): Promise<AIResponse> {
    const ollamaModel = this.modelMap[context]

    try {
      aiLogger.debug('Sending message to AI provider', {
        model: ollamaModel,
        context,
        messageCount: messages.length,
        provider: 'ollama',
      })

      const response = await this.sendToOllama(messages, ollamaModel)

      aiLogger.info('AI message processed successfully', {
        model: ollamaModel,
        context,
        provider: 'ollama',
        tokensUsed: response.tokensUsed,
      })

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      aiLogger.warn('Ollama failed, trying DeepSeek fallback', {
        context,
        errorMessage,
      })

      // Try DeepSeek fallback
      try {
        const deepseekModel = this.deepseekModelMap[context]
        const response = await this.sendToDeepSeek(messages, deepseekModel)
        
        aiLogger.info('AI message processed via DeepSeek fallback', {
          model: deepseekModel,
          context,
          provider: 'deepseek',
          tokensUsed: response.tokensUsed,
        })

        return response
      } catch (fallbackError) {
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        aiLogger.error('Both Ollama and DeepSeek failed', fallbackError, {
          context,
          ollamaError: errorMessage,
          deepseekError: fallbackMsg,
        })
        throw new Error(`AI provider unavailable. Ollama: ${errorMessage}. DeepSeek: ${fallbackMsg}`)
      }
    }
  }

  /**
   * Send message to Ollama (OpenAI-compatible API)
   */
  private async sendToOllama(messages: AIMessage[], model: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const err = new Error(
          error.error?.message || 
          error.message || 
          `Ollama API error (${response.status})`
        )
        ;(err as any).status = response.status
        throw err
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''

      return {
        text,
        provider: 'local',
        model,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const err = new Error(
          `Cannot connect to Ollama at ${this.getOllamaUrl()}. Is it running?`
        )
        aiLogger.error('Ollama connection error', err)
        throw err
      }
      throw error
    }
  }

  /**
   * Send message to DeepSeek API (fallback)
   */
  private async sendToDeepSeek(messages: AIMessage[], model: string): Promise<AIResponse> {
    const apiKey = this.getDeepSeekApiKey()
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not configured')
    }

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        const err = new Error(
          error.error?.message || 
          error.message || 
          `DeepSeek API error (${response.status})`
        )
        ;(err as any).status = response.status
        throw err
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''

      return {
        text,
        provider: 'deepseek',
        model,
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      aiLogger.error('DeepSeek API error', error)
      throw error
    }
  }

  /**
   * Check Ollama server status
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get loaded models from Ollama
   */
  async getLoadedModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/tags`)
      if (!response.ok) return []
      const data = await response.json()
      return (data.models || []).map((m: any) => m.name || m.model)
    } catch {
      return []
    }
  }

  /**
   * Get provider status (for debugging)
   */
  async getStatus() {
    const isAlive = await this.checkStatus()
    const models = await this.getLoadedModels()

    return {
      ollamaUrl: this.getOllamaUrl(),
      alive: isAlive,
      loadedModels: models,
      modelMap: this.modelMap,
    }
  }
}

// Export singleton instance
export const aiProvider = new AIProviderService()

export default aiProvider
