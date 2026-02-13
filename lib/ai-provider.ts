import { logger } from './logger'

export type AIProvider = 'anthropic' | 'gemini' | 'openai'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  provider: AIProvider
  tokensUsed?: number
}

const aiLogger = logger.createChild('ai-provider')

/**
 * Multi-provider AI service with automatic fallback on rate limits
 * Primary: Anthropic Claude
 * Fallback: Google Gemini
 */
class AIProviderService {
  private primaryProvider: AIProvider = 'anthropic'
  private fallbackProvider: AIProvider = 'gemini'
  private rateLimitedProviders: Set<AIProvider> = new Set()
  private rateLimitResetTime: Map<AIProvider, number> = new Map()

  /**
   * Send a message and get AI response, with automatic provider fallback
   */
  async sendMessage(
    messages: AIMessage[],
    preferredProvider?: AIProvider
  ): Promise<AIResponse> {
    const provider = preferredProvider || this.getAvailableProvider()

    try {
      aiLogger.debug('Sending message to AI provider', {
        provider,
        messageCount: messages.length,
      })

      let response: AIResponse

      if (provider === 'gemini') {
        response = await this.sendToGemini(messages)
      } else if (provider === 'openai') {
        response = await this.sendToOpenAI(messages)
      } else {
        response = await this.sendToAnthropic(messages)
      }

      // Clear rate limit flag on success
      this.rateLimitedProviders.delete(provider)
      aiLogger.info('AI message processed successfully', {
        provider,
        tokensUsed: response.tokensUsed,
      })

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if rate limited
      if (this.isRateLimit(error)) {
        aiLogger.warn('Rate limit hit', { provider, error: errorMessage })
        this.rateLimitedProviders.add(provider)
        this.rateLimitResetTime.set(provider, Date.now() + 60000) // 60s cooldown

        // Try fallback provider
        if (provider !== this.fallbackProvider) {
          aiLogger.info('Switching to fallback provider', {
            from: provider,
            to: this.fallbackProvider,
          })
          return this.sendMessage(messages, this.fallbackProvider)
        }
      }

      aiLogger.error('AI provider error', error, { provider, errorMessage })
      throw error
    }
  }

  /**
   * Get the best available provider (respecting rate limits)
   */
  private getAvailableProvider(): AIProvider {
    const now = Date.now()

    // Check if primary is rate limited and still in cooldown
    if (this.rateLimitedProviders.has(this.primaryProvider)) {
      const resetTime = this.rateLimitResetTime.get(this.primaryProvider)
      if (resetTime && now < resetTime) {
        aiLogger.debug('Primary provider still rate limited, using fallback', {
          resetIn: Math.ceil((resetTime - now) / 1000),
        })
        return this.fallbackProvider
      } else {
        // Cooldown expired, try primary again
        this.rateLimitedProviders.delete(this.primaryProvider)
      }
    }

    return this.primaryProvider
  }

  /**
   * Send message to Anthropic Claude
   */
  private async sendToAnthropic(messages: AIMessage[]): Promise<AIResponse> {
    // This would use the actual Anthropic SDK
    // For now, return a placeholder that shows the pattern
    throw new Error('Anthropic integration not implemented in this example')
  }

  /**
   * Send message to Google Gemini
   */
  private async sendToGemini(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured')
    }

    try {
      // Using Gemini API via REST (would normally use SDK)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        const err = new Error(error.error?.message || 'Gemini API error')
        ;(err as any).status = response.status
        throw err
      }

      const data = await response.json()
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      return {
        text,
        provider: 'gemini',
        tokensUsed: data.usageMetadata?.totalTokenCount,
      }
    } catch (error) {
      aiLogger.error('Gemini API error', error)
      throw error
    }
  }

  /**
   * Send message to OpenAI (ChatGPT)
   */
  private async sendToOpenAI(messages: AIMessage[]): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        const err = new Error(error.error?.message || 'OpenAI API error')
        ;(err as any).status = response.status
        throw err
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''

      return {
        text,
        provider: 'openai',
        tokensUsed: data.usage?.total_tokens,
      }
    } catch (error) {
      aiLogger.error('OpenAI API error', error)
      throw error
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimit(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const message = error.message.toLowerCase()
    const status = (error as any).status

    return (
      status === 429 ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('too many requests')
    )
  }

  /**
   * Get provider status (for debugging)
   */
  getStatus() {
    return {
      primaryProvider: this.primaryProvider,
      fallbackProvider: this.fallbackProvider,
      rateLimitedProviders: Array.from(this.rateLimitedProviders),
      rateLimitResets: Object.fromEntries(
        Array.from(this.rateLimitResetTime.entries()).map(([provider, time]) => [
          provider,
          new Date(time).toISOString(),
        ])
      ),
    }
  }
}

// Export singleton instance
export const aiProvider = new AIProviderService()

export default aiProvider
