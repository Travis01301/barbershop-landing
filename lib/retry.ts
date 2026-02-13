import { logger } from './logger'

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableStatuses?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 503, 504], // Rate limit, Service unavailable, Gateway timeout
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with exponential backoff retry logic
 * Retries on 429 (rate limit), 503 (service unavailable), 504 (gateway timeout)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const retryLogger = logger.createChild('retry')

  let lastError: Error | null = null
  let delayMs = opts.initialDelayMs

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      const statusCode = (error as any)?.statusCode || (error as any)?.status
      const isRetryable =
        opts.retryableStatuses.includes(statusCode) ||
        error instanceof TypeError // Network errors
      
      if (!isRetryable || attempt === opts.maxAttempts) {
        retryLogger.error('Operation failed, not retrying', {
          attempt,
          maxAttempts: opts.maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 0.1 * delayMs
      const waitTime = Math.min(delayMs + jitter, opts.maxDelayMs)

      retryLogger.warn('Operation failed, retrying with backoff', {
        attempt,
        nextAttempt: attempt + 1,
        waitTimeMs: Math.round(waitTime),
        statusCode,
        error: error instanceof Error ? error.message : String(error),
      })

      await sleep(waitTime)
      delayMs = Math.min(delayMs * opts.backoffMultiplier, opts.maxDelayMs)
    }
  }

  // This should never be reached due to throw above, but TypeScript requires it
  throw lastError || new Error('Retry failed without error')
}

/**
 * Wrapper for fetch with automatic retry on rate limits
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init)
      
      // Throw if rate limited so retry logic kicks in
      if (response.status === 429 || response.status === 503 || response.status === 504) {
        const error = new Error(`HTTP ${response.status}`)
        ;(error as any).status = response.status
        throw error
      }

      return response
    },
    options
  )
}

export default { withRetry, fetchWithRetry, sleep }
