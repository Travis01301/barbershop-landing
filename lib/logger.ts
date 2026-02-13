/**
 * Structured Logger for Barbershop Landing
 * 
 * Provides severity levels: debug, info, warn, error
 * Each log entry includes: timestamp, level, message, context data
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, any>

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  stackTrace?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logHistory: LogEntry[] = []
  private maxHistorySize = 1000

  /**
   * Log at debug level (development only)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log at error level with optional error object
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const stackTrace = error instanceof Error ? error.stack : undefined
    const mergedContext = context || {}
    
    if (error instanceof Error) {
      mergedContext.errorName = error.name
      mergedContext.errorMessage = error.message
    } else if (error) {
      mergedContext.error = String(error)
    }

    this.log('error', message, mergedContext, stackTrace)
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, stackTrace?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(stackTrace && { stackTrace }),
    }

    // Store in history
    this.logHistory.push(entry)
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift()
    }

    // Output to console
    this.printLog(entry)
  }

  /**
   * Format and print log entry to console
   */
  private printLog(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`
    const logFn = this.getConsoleMethod(entry.level)

    if (entry.context) {
      logFn(`${prefix} ${entry.message}`, entry.context)
    } else {
      logFn(`${prefix} ${entry.message}`)
    }

    if (entry.stackTrace && this.isDevelopment) {
      logFn(entry.stackTrace)
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug
      case 'info':
        return console.info
      case 'warn':
        return console.warn
      case 'error':
        return console.error
      default:
        return console.log
    }
  }

  /**
   * Get recent log entries
   */
  getHistory(count: number = 100): LogEntry[] {
    return this.logHistory.slice(-count)
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = []
  }

  /**
   * Create a child logger with context prefix
   */
  createChild(prefix: string) {
    return {
      debug: (msg: string, ctx?: LogContext) => this.debug(`[${prefix}] ${msg}`, ctx),
      info: (msg: string, ctx?: LogContext) => this.info(`[${prefix}] ${msg}`, ctx),
      warn: (msg: string, ctx?: LogContext) => this.warn(`[${prefix}] ${msg}`, ctx),
      error: (msg: string, err?: Error | unknown, ctx?: LogContext) =>
        this.error(`[${prefix}] ${msg}`, err, ctx),
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for context
export type { LogContext, LogLevel, LogEntry }

// Export logger class for testing purposes
export default Logger
