import { withRetry, fetchWithRetry } from '@/lib/retry'

describe('Retry Logic', () => {
  describe('withRetry', () => {
    it('should return result on first attempt if successful', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')

      const result = await withRetry(mockFn)

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on 429 and succeed', async () => {
      const error = new Error('Rate limited')
      ;(error as any).status = 429
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')

      const result = await withRetry(mockFn, { maxAttempts: 3, initialDelayMs: 10 })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    }, 10000)

    it('should give up after maxAttempts', async () => {
      const error = new Error('Rate limited')
      ;(error as any).status = 429
      const mockFn = jest.fn().mockRejectedValue(error)

      await expect(
        withRetry(mockFn, { maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 20 })
      ).rejects.toThrow('Rate limited')

      expect(mockFn).toHaveBeenCalledTimes(2)
    }, 10000)

    it('should not retry on non-retryable errors (400)', async () => {
      const error = new Error('Bad request')
      ;(error as any).status = 400
      const mockFn = jest.fn().mockRejectedValue(error)

      await expect(
        withRetry(mockFn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toThrow('Bad request')

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on 503 (service unavailable)', async () => {
      const error = new Error('Service unavailable')
      ;(error as any).status = 503
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')

      const result = await withRetry(mockFn, {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    }, 10000)

    it('should retry on network errors (TypeError)', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce('success')

      const result = await withRetry(mockFn, {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    }, 10000)
  })

  describe('fetchWithRetry', () => {
    it('should return response on success', async () => {
      const mockResponse = { status: 200, ok: true } as Response
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await fetchWithRetry('http://test.com')

      expect(result).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should not retry on 200 response', async () => {
      const successResponse = { status: 200, ok: true } as Response
      global.fetch = jest.fn().mockResolvedValue(successResponse)

      const result = await fetchWithRetry('http://test.com', undefined, {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result).toBe(successResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should not retry on 400 response', async () => {
      const errorResponse = { status: 400, ok: false } as Response
      global.fetch = jest.fn().mockResolvedValue(errorResponse)

      const result = await fetchWithRetry('http://test.com', undefined, {
        maxAttempts: 3,
        initialDelayMs: 10,
      })

      expect(result).toBe(errorResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on 429 response', async () => {
      const successResponse = { status: 200, ok: true } as Response
      const rateLimitResponse = { status: 429, ok: false } as Response
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(successResponse)

      const result = await fetchWithRetry('http://test.com', undefined, {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result).toBe(successResponse)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    }, 10000)
  })
})
