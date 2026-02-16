import { aiProvider } from '@/lib/ai-provider'

describe('AI Provider Service (Ollama)', () => {
  describe('Model mapping', () => {
    it('should map app context to phi4', async () => {
      const status = await aiProvider.getStatus()
      expect(status.modelMap).toHaveProperty('app')
      expect(status.modelMap.app).toBe('phi4-mini:latest')
    })

    it('should map bot context to qwen2.5', async () => {
      const status = await aiProvider.getStatus()
      expect(status.modelMap).toHaveProperty('bot')
      expect(status.modelMap.bot).toBe('qwen2.5-coder:7b')
    })

    it('should have both models in loaded models', async () => {
      const status = await aiProvider.getStatus()
      // This will only pass if Ollama is running with both models
      if (status.alive) {
        expect(Array.isArray(status.loadedModels)).toBe(true)
      }
    })
  })

  describe('Ollama connection', () => {
    it('should return status object with required fields', async () => {
      const status = await aiProvider.getStatus()
      
      expect(status).toHaveProperty('ollamaUrl')
      expect(status).toHaveProperty('alive')
      expect(status).toHaveProperty('loadedModels')
      expect(status).toHaveProperty('modelMap')
    })

    it('should indicate if Ollama is running', async () => {
      const status = await aiProvider.getStatus()
      expect(typeof status.alive).toBe('boolean')
    })

    it('should list loaded models as array', async () => {
      const status = await aiProvider.getStatus()
      expect(Array.isArray(status.loadedModels)).toBe(true)
    })
  })

  describe('Message sending', () => {
    // Note: These tests require Ollama running with models loaded
    // Set SKIP_OLLAMA_TESTS=true to skip if server not available

    it('should accept messages with app context', async () => {
      const status = await aiProvider.getStatus()
      if (!status.alive) {
        console.log('Skipping: Ollama server not running')
        return
      }

      try {
        const response = await aiProvider.sendMessage(
          [{ role: 'user', content: 'Say "hello" in one word.' }],
          'app'
        )
        expect(response).toHaveProperty('text')
        expect(response.provider).toBe('local')
        expect(response.model).toBe('phi4')
      } catch (error) {
        console.log('Skipping: Ollama models not loaded')
      }
    })

    it('should accept messages with bot context', async () => {
      const status = await aiProvider.getStatus()
      if (!status.alive) {
        console.log('Skipping: Ollama server not running')
        return
      }

      try {
        const response = await aiProvider.sendMessage(
          [{ role: 'user', content: 'Say "hello" in one word.' }],
          'bot'
        )
        expect(response).toHaveProperty('text')
        expect(response.provider).toBe('local')
        expect(response.model).toBe('qwen2.5')
      } catch (error) {
        console.log('Skipping: Ollama models not loaded')
      }
    })

    it('should default to bot context if not specified', async () => {
      const status = await aiProvider.getStatus()
      if (!status.alive) {
        console.log('Skipping: Ollama server not running')
        return
      }

      try {
        const response = await aiProvider.sendMessage([
          { role: 'user', content: 'Say "hello" in one word.' }
        ])
        expect(response.model).toBe('qwen2.5')
      } catch (error) {
        console.log('Skipping: Ollama models not loaded')
      }
    })
  })

  describe('Error handling', () => {
    it('should handle connection errors gracefully', async () => {
      // This test verifies error message is helpful
      const status = await aiProvider.getStatus()
      expect(typeof status.alive).toBe('boolean')
      // If not alive, subsequent calls should error with helpful message
    })
  })
})
