import { logger } from './logger'

export type AIProvider = 'phi4' | 'qwen2.5' | 'local'
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
 * Local LLM service using Ollama
 * phi4 (fast) → barbershop app (customer-facing)
 * qwen2.5 (reasoning) → bot & sub-agents (complex tasks)
 */
class AIProviderService {
  private getOllamaUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }
  
  // Model mapping by context
  private modelMap: Record<ModelContext, string> = {
    app: 'phi4-mini:latest',        // Fast, lightweight for booking confirmations
    bot: 'qwen2.5-coder:7b',        // Better reasoning for bot tasks & sub-agents
  }

  /**
   * Send a message and get AI response
   * @param messages - Chat history
   * @param context - Use case: 'app' (phi4) or 'bot' (qwen2.5)
   */
  async sendMessage(
    messages: AIMessage[],
    context: ModelContext = 'bot'
  ): Promise<AIResponse> {
    const model = this.modelMap[context]

    try {
      aiLogger.debug('Sending message to local LLM', {
        model,
        context,
        messageCount: messages.length,
      })

      const response = await this.sendToOllama(messages, model)

      aiLogger.info('Local LLM message processed successfully', {
        model,
        context,
        tokensUsed: response.tokensUsed,
      })

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      aiLogger.error('Local LLM error', error, { model, context, errorMessage })
      throw error
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
