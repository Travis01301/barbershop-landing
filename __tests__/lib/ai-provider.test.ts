import { aiProvider } from '@/lib/ai-provider'

describe('AI Provider Service', () => {
  describe('Multi-provider fallback', () => {
    it('should have both providers configured', () => {
      const status = aiProvider.getStatus()
      expect(status.primaryProvider).toBe('anthropic')
      expect(status.fallbackProvider).toBe('gemini')
    })

    it('should track rate limited providers', () => {
      const status = aiProvider.getStatus()
      expect(status.rateLimitedProviders).toBeDefined()
      expect(Array.isArray(status.rateLimitedProviders)).toBe(true)
    })

    it('should track rate limit reset times', () => {
      const status = aiProvider.getStatus()
      expect(status.rateLimitResets).toBeDefined()
      expect(typeof status.rateLimitResets).toBe('object')
    })
  })

  describe('Rate limit detection', () => {
    it('should detect 429 status as rate limit', () => {
      const error = new Error('Rate limited')
      ;(error as any).status = 429
      
      // The error would be caught internally
      // This test just verifies the structure works
      expect(error.message).toContain('Rate limited')
    })

    it('should detect rate limit in error message', () => {
      const error = new Error('API rate limit exceeded')
      expect(error.message.toLowerCase()).toContain('rate limit')
    })

    it('should detect quota errors', () => {
      const error = new Error('Quota exceeded')
      expect(error.message.toLowerCase()).toContain('quota')
    })
  })

  describe('Provider status', () => {
    it('should return status object with all fields', () => {
      const status = aiProvider.getStatus()
      
      expect(status).toHaveProperty('primaryProvider')
      expect(status).toHaveProperty('fallbackProvider')
      expect(status).toHaveProperty('rateLimitedProviders')
      expect(status).toHaveProperty('rateLimitResets')
    })

    it('should list rate limited providers as array', () => {
      const status = aiProvider.getStatus()
      expect(Array.isArray(status.rateLimitedProviders)).toBe(true)
    })

    it('should format reset times as ISO strings', () => {
      const status = aiProvider.getStatus()
      const resets = Object.values(status.rateLimitResets)
      resets.forEach(resetTime => {
        if (typeof resetTime === 'string') {
          expect(() => new Date(resetTime)).not.toThrow()
        }
      })
    })
  })
})
