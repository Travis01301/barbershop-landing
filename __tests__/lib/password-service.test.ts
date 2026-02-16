import { passwordService } from '@/lib/password-service'

describe('Password Service', () => {
  const testPassword = 'TestPass123'
  const weakPassword = 'weak'

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const hash = await passwordService.hashPassword(testPassword)

      expect(hash).toBeTruthy()
      expect(hash.length).toBeGreaterThan(20)
      expect(hash.startsWith('$2')).toBe(true) // bcrypt format
    })

    it('should reject passwords shorter than 6 characters', async () => {
      await expect(passwordService.hashPassword('short')).rejects.toThrow()
    })

    it('should create different hashes for same password', async () => {
      const hash1 = await passwordService.hashPassword(testPassword)
      const hash2 = await passwordService.hashPassword(testPassword)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await passwordService.hashPassword(testPassword)
      const isValid = await passwordService.verifyPassword(testPassword, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hash = await passwordService.hashPassword(testPassword)
      const isValid = await passwordService.verifyPassword('WrongPass123', hash)

      expect(isValid).toBe(false)
    })

    it('should handle invalid hash gracefully', async () => {
      const isValid = await passwordService.verifyPassword(testPassword, 'invalid_hash')

      expect(isValid).toBe(false)
    })

    it('should be case-sensitive', async () => {
      const hash = await passwordService.hashPassword(testPassword)
      const isValid = await passwordService.verifyPassword('testpass123', hash)

      expect(isValid).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const error = passwordService.validatePasswordStrength('Strong123')

      expect(error).toBeNull()
    })

    it('should reject password too short', () => {
      const error = passwordService.validatePasswordStrength('Short')

      expect(error).toContain('at least 6 characters')
    })

    it('should reject password without lowercase', () => {
      const error = passwordService.validatePasswordStrength('TESTPASS123')

      expect(error).toContain('lowercase')
    })

    it('should reject password without uppercase', () => {
      const error = passwordService.validatePasswordStrength('testpass123')

      expect(error).toContain('uppercase')
    })

    it('should reject password without numbers', () => {
      const error = passwordService.validatePasswordStrength('TestPassword')

      expect(error).toContain('numbers')
    })

    it('should reject password too long', () => {
      const longPassword = 'A1a' + 'x'.repeat(130)
      const error = passwordService.validatePasswordStrength(longPassword)

      expect(error).toContain('less than 128 characters')
    })
  })

  describe('needsRehashing', () => {
    it('should return false for recent hash', async () => {
      const hash = await passwordService.hashPassword(testPassword)
      const needsRehash = await passwordService.needsRehashing(hash)

      expect(needsRehash).toBe(false)
    })

    it('should return false for invalid hash', async () => {
      const needsRehash = await passwordService.needsRehashing('not_a_hash')

      expect(needsRehash).toBe(false)
    })
  })

  describe('rehashPassword', () => {
    it('should rehash valid password', async () => {
      const oldHash = await passwordService.hashPassword(testPassword)
      const newHash = await passwordService.rehashPassword(testPassword, oldHash)

      expect(newHash).toBeTruthy()
      expect(newHash).not.toBe(oldHash)
    })

    it('should return null for wrong password', async () => {
      const hash = await passwordService.hashPassword(testPassword)
      const result = await passwordService.rehashPassword('WrongPass123', hash)

      expect(result).toBeNull()
    })

    it('should verify new hash with original password', async () => {
      const oldHash = await passwordService.hashPassword(testPassword)
      const newHash = await passwordService.rehashPassword(testPassword, oldHash)

      const isValid = await passwordService.verifyPassword(testPassword, newHash!)

      expect(isValid).toBe(true)
    })
  })

  describe('Security', () => {
    it('should use bcrypt hash format', async () => {
      const hash = await passwordService.hashPassword(testPassword)

      // bcrypt format: $2a$10$... or $2b$10$... or $2y$10$...
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
    })

    it('should not expose password in error messages', async () => {
      try {
        await passwordService.hashPassword('short')
      } catch (error) {
        const message = (error as Error).message.toLowerCase()
        expect(message).not.toContain('short')
      }
    })
  })
})
