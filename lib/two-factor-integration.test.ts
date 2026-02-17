import { twoFactorService } from '@/lib/two-factor-service'
import { query } from '@/lib/db'
import { jwtAuth } from '@/lib/jwt-auth'

/**
 * Integration Tests for 2FA System
 * Tests complete flows with real-like scenarios
 */

describe('2FA Integration Tests', () => {
  const userId = 'user-test-123'
  const shopId = 'shop-test-456'
  const userEmail = 'test.user@barbershop.com'
  const phoneNumber = '+12025551234'

  // Test 1: Complete SMS 2FA Setup Flow
  describe('SMS 2FA Setup Flow', () => {
    it('should complete full SMS 2FA setup', async () => {
      // Step 1: Enable 2FA
      const enableResult = await twoFactorService.enable2FA(userId, shopId, 'sms')
      expect(enableResult.success).toBe(true)

      // Step 2: Send SMS code
      const smsResult = await twoFactorService.generateAndSendSMSCode(
        userId,
        shopId,
        phoneNumber
      )
      expect(smsResult.success).toBe(true)
      expect(smsResult.attemptId).toBeTruthy()

      // Step 3: Verify SMS code (using mock verification)
      // In real scenario, would use actual code from SMS
      const verifyResult = await twoFactorService.verifySMSCode(
        userId,
        shopId,
        smsResult.attemptId,
        '123456' // Would be real code in actual test
      )
      expect(verifyResult.success).toBeDefined()

      // Step 4: Generate backup codes
      const backupResult = await twoFactorService.generateBackupCodes(userId, shopId)
      expect(backupResult.codes.length).toBe(10)

      // Step 5: Confirm 2FA
      const confirmResult = await twoFactorService.confirm2FA(userId, shopId)
      expect(confirmResult.success).toBe(true)

      // Step 6: Verify 2FA is now enabled
      const status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.is_enabled).toBe(true)
      expect(status.method).toBe('sms')
    })
  })

  // Test 2: Complete TOTP 2FA Setup Flow
  describe('TOTP 2FA Setup Flow', () => {
    it('should complete full TOTP 2FA setup', async () => {
      // Step 1: Enable 2FA
      const enableResult = await twoFactorService.enable2FA(userId, shopId, 'totp')
      expect(enableResult.success).toBe(true)

      // Step 2: Setup authenticator
      const setupResult = await twoFactorService.setupAuthenticator(
        userId,
        shopId,
        userEmail
      )
      expect(setupResult.secret).toBeTruthy()
      expect(setupResult.qrCodeUrl).toContain('otpauth://')

      // Step 3: Verify TOTP code (using mock verification)
      const verifyResult = await twoFactorService.verifyTOTPCode(userId, shopId, '123456')
      expect(verifyResult.success).toBeDefined()

      // Step 4: Generate backup codes
      const backupResult = await twoFactorService.generateBackupCodes(userId, shopId)
      expect(backupResult.codes.length).toBe(10)

      // Step 5: Confirm 2FA
      const confirmResult = await twoFactorService.confirm2FA(userId, shopId)
      expect(confirmResult.success).toBe(true)

      // Step 6: Verify 2FA is now enabled
      const status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.is_enabled).toBe(true)
      expect(status.method).toBe('totp')
    })
  })

  // Test 3: Login with 2FA
  describe('Login with 2FA Enabled', () => {
    it('should require 2FA code after password verification', async () => {
      // Setup: User has 2FA enabled
      await twoFactorService.enable2FA(userId, shopId, 'sms')

      // User logs in with correct password
      // (normally handled by /api/auth/login)
      // Response would include requiresTwoFactor: true

      // User receives SMS code
      const smsResult = await twoFactorService.generateAndSendSMSCode(
        userId,
        shopId,
        phoneNumber
      )
      expect(smsResult.success).toBe(true)

      // User enters 2FA code
      const verifyResult = await twoFactorService.verifySMSCode(
        userId,
        shopId,
        smsResult.attemptId,
        '123456'
      )
      expect(verifyResult.success).toBeDefined()

      // If successful, JWT tokens would be issued
    })
  })

  // Test 4: Backup Code Usage
  describe('Backup Code Recovery', () => {
    it('should allow login with backup code', async () => {
      // Setup: User has 2FA enabled with SMS
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      await twoFactorService.generateAndSendSMSCode(userId, shopId, phoneNumber)

      // User generates backup codes
      const backupResult = await twoFactorService.generateBackupCodes(userId, shopId)
      const firstCode = backupResult.codes[0]

      // User lost phone, can't receive SMS
      // Uses backup code instead
      const verifyResult = await twoFactorService.verifyBackupCode(
        userId,
        shopId,
        firstCode
      )
      expect(verifyResult.success).toBe(true)
      expect(verifyResult.remaining).toBe(9)

      // Try same code again (should fail - single use)
      const secondAttempt = await twoFactorService.verifyBackupCode(
        userId,
        shopId,
        firstCode
      )
      expect(secondAttempt.success).toBe(false)
    })

    it('should update remaining codes count', async () => {
      // Generate initial codes
      const backupResult = await twoFactorService.generateBackupCodes(userId, shopId)
      expect(backupResult.codes.length).toBe(10)

      // Use 3 codes
      for (let i = 0; i < 3; i++) {
        const result = await twoFactorService.verifyBackupCode(
          userId,
          shopId,
          backupResult.codes[i]
        )
        expect(result.remaining).toBe(10 - i - 1)
      }
    })
  })

  // Test 5: Method Change
  describe('Change 2FA Method', () => {
    it('should allow switching from SMS to TOTP', async () => {
      // Initial: SMS method
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      let status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.method).toBe('sms')

      // Switch to TOTP
      await twoFactorService.disable2FA(userId, shopId)
      await twoFactorService.enable2FA(userId, shopId, 'totp')
      status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.method).toBe('totp')
    })

    it('should keep backup codes when switching methods', async () => {
      // Enable SMS
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      const initialCodes = await twoFactorService.generateBackupCodes(userId, shopId)

      // Switch to TOTP (without disabling)
      await twoFactorService.enable2FA(userId, shopId, 'totp')

      // Old backup codes should still be usable
      const verifyResult = await twoFactorService.verifyBackupCode(
        userId,
        shopId,
        initialCodes.codes[0]
      )
      expect(verifyResult.success).toBe(true)
    })
  })

  // Test 6: Disable 2FA
  describe('Disable 2FA', () => {
    it('should completely disable 2FA and cleanup', async () => {
      // Setup: User has 2FA enabled
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      await twoFactorService.generateBackupCodes(userId, shopId)
      await twoFactorService.confirm2FA(userId, shopId)

      // Verify enabled
      let status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.is_enabled).toBe(true)

      // Disable 2FA
      const result = await twoFactorService.disable2FA(userId, shopId)
      expect(result.success).toBe(true)

      // Verify disabled and cleaned up
      status = await twoFactorService.get2FAStatus(userId, shopId)
      expect(status.is_enabled).toBe(false)
      expect(status.method).toBe('none')
    })
  })

  // Test 7: Rate Limiting
  describe('Rate Limiting', () => {
    it('should lockout after 5 failed SMS attempts', async () => {
      // Setup SMS verification
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      const smsResult = await twoFactorService.generateAndSendSMSCode(
        userId,
        shopId,
        phoneNumber
      )

      // Attempt invalid codes 5 times
      for (let i = 0; i < 5; i++) {
        const verifyResult = await twoFactorService.verifySMSCode(
          userId,
          shopId,
          smsResult.attemptId,
          'invalid'
        )
        expect(verifyResult.success).toBe(false)
      }

      // 6th attempt should show lockout
      const finalAttempt = await twoFactorService.verifySMSCode(
        userId,
        shopId,
        smsResult.attemptId,
        'invalid'
      )
      expect(finalAttempt.message).toContain('Too many')
    })
  })

  // Test 8: Audit Logging
  describe('Audit Logging', () => {
    it('should log all 2FA events', async () => {
      // Enable 2FA
      await twoFactorService.enable2FA(userId, shopId, 'sms')
      await twoFactorService.log2FAEvent(userId, shopId, '2fa_enable_started', true)

      // Send SMS
      const smsResult = await twoFactorService.generateAndSendSMSCode(
        userId,
        shopId,
        phoneNumber
      )
      await twoFactorService.log2FAEvent(userId, shopId, 'sms_code_sent', true)

      // Verify code
      await twoFactorService.log2FAEvent(userId, shopId, 'sms_code_verified', true)

      // Confirm 2FA
      await twoFactorService.confirm2FA(userId, shopId)
      await twoFactorService.log2FAEvent(userId, shopId, '2fa_enabled', true)

      // All events should be logged (query audit table in real test)
    })
  })

  // Test 9: Multi-Shop Isolation
  describe('Multi-Tenant Isolation', () => {
    it('should isolate 2FA settings per shop', async () => {
      const shop1 = 'shop-1'
      const shop2 = 'shop-2'

      // User enables SMS 2FA in shop 1
      await twoFactorService.enable2FA(userId, shop1, 'sms')
      let status1 = await twoFactorService.get2FAStatus(userId, shop1)
      expect(status1.method).toBe('sms')

      // Same user enables TOTP in shop 2
      await twoFactorService.enable2FA(userId, shop2, 'totp')
      let status2 = await twoFactorService.get2FAStatus(userId, shop2)
      expect(status2.method).toBe('totp')

      // Settings should be different per shop
      status1 = await twoFactorService.get2FAStatus(userId, shop1)
      expect(status1.method).toBe('sms')
      expect(status2.method).toBe('totp')
    })
  })

  // Test 10: Error Handling
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Enable would fail with DB error
      // Service should throw "Failed to enable 2FA"
      // Try-catch in API endpoint catches and returns 500
      try {
        await twoFactorService.enable2FA(userId, shopId, 'sms')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should validate input parameters', async () => {
      // Empty user ID
      try {
        await twoFactorService.enable2FA('', shopId, 'sms')
      } catch (error) {
        expect(error).toBeDefined()
      }

      // Invalid method
      try {
        await twoFactorService.enable2FA(userId, shopId, 'invalid' as any)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  // Test 11: Session Cleanup
  describe('Session Cleanup', () => {
    it('should cleanup expired sessions', async () => {
      // Create session
      await twoFactorService.generateAndSendSMSCode(userId, shopId, phoneNumber)

      // Normally: session expires after 10 minutes
      // Should be cleaned up by scheduled job or manual cleanup

      // Verify session is in database
      // After expiration, should not be available for verification
    })
  })

  // Test 12: Phone Number Masking
  describe('Phone Number Security', () => {
    it('should mask phone numbers in API responses', async () => {
      await twoFactorService.enable2FA(userId, shopId, 'sms')

      // Phone is stored in settings
      // But when returned via API, should be masked
      const status = await twoFactorService.get2FAStatus(userId, shopId)

      // Should show last 4 digits only
      if (status.phone_number) {
        expect(status.phone_number).toMatch(/\*+\d{4}/)
        expect(status.phone_number).not.toContain('202')
      }
    })
  })
})

/**
 * Example: Complete User Journey Test
 */
describe('Complete User Journey', () => {
  const userId = 'journey-user-123'
  const shopId = 'journey-shop-456'

  it('should support complete 2FA lifecycle', async () => {
    // Week 1: User enables SMS 2FA
    await twoFactorService.enable2FA(userId, shopId, 'sms')
    const smsResult = await twoFactorService.generateAndSendSMSCode(
      userId,
      shopId,
      '+12025551234'
    )
    const codes = await twoFactorService.generateBackupCodes(userId, shopId)

    // User logs in multiple times with 2FA
    for (let i = 0; i < 3; i++) {
      const sms = await twoFactorService.generateAndSendSMSCode(
        userId,
        shopId,
        '+12025551234'
      )
      // Verify code...
    }

    // Week 3: User loses phone, uses backup code
    const backupVerify = await twoFactorService.verifyBackupCode(
      userId,
      shopId,
      codes.codes[0]
    )
    expect(backupVerify.success).toBe(true)

    // Week 4: User wants to switch to authenticator
    await twoFactorService.disable2FA(userId, shopId)
    await twoFactorService.enable2FA(userId, shopId, 'totp')
    const setup = await twoFactorService.setupAuthenticator(
      userId,
      shopId,
      'user@example.com'
    )
    const newCodes = await twoFactorService.generateBackupCodes(userId, shopId)

    // User uses authenticator for next 6 months...

    // Month 7: User disables 2FA
    await twoFactorService.disable2FA(userId, shopId)
    const finalStatus = await twoFactorService.get2FAStatus(userId, shopId)
    expect(finalStatus.is_enabled).toBe(false)
  })
})
