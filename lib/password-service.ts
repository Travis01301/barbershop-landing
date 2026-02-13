import bcrypt from 'bcrypt'
import { logger } from './logger'

const passwordLogger = logger.createChild('password-service')

/**
 * Password hashing and verification service
 * Uses bcrypt for secure password handling
 */
class PasswordService {
  private saltRounds = 10 // Balance between security and performance

  /**
   * Hash a plain text password
   * Should be used during signup
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const hash = await bcrypt.hash(password, this.saltRounds)
      passwordLogger.debug('Password hashed')
      return hash
    } catch (error) {
      passwordLogger.error('Error hashing password', error)
      throw error
    }
  }

  /**
   * Verify a plain text password against a hash
   * Should be used during login
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const match = await bcrypt.compare(password, hash)
      if (!match) {
        passwordLogger.debug('Password verification failed')
      }
      return match
    } catch (error) {
      passwordLogger.error('Error verifying password', error)
      return false
    }
  }

  /**
   * Validate password strength
   * Returns validation error message or null if valid
   */
  validatePasswordStrength(password: string): string | null {
    if (password.length < 6) {
      return 'Password must be at least 6 characters'
    }
    if (password.length > 128) {
      return 'Password must be less than 128 characters'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain lowercase letters'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain uppercase letters'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain numbers'
    }
    return null
  }

  /**
   * Check if a password needs rehashing (bcrypt cost increased)
   */
  async needsRehashing(hash: string): Promise<boolean> {
    try {
      // Extract the cost factor from the hash
      const match = hash.match(/^\$2[aby]\$(\d+)\$/)
      if (!match) return false

      const cost = parseInt(match[1])
      return cost < this.saltRounds
    } catch (error) {
      passwordLogger.warn('Error checking if password needs rehashing', error)
      return false
    }
  }

  /**
   * Rehash a password with current parameters
   * Useful for updating old hashes when cost factor changes
   */
  async rehashPassword(password: string, oldHash: string): Promise<string | null> {
    try {
      const isValid = await this.verifyPassword(password, oldHash)
      if (!isValid) {
        passwordLogger.warn('Cannot rehash - password does not match old hash')
        return null
      }

      const newHash = await this.hashPassword(password)
      passwordLogger.debug('Password rehashed')
      return newHash
    } catch (error) {
      passwordLogger.error('Error rehashing password', error)
      return null
    }
  }
}

export const passwordService = new PasswordService()

export default passwordService
