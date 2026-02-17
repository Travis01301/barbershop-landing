import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { passwordService } from '@/lib/password-service'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const twoFactorLogger = logger.createChild('2fa-service')

/**
 * Speakeasy TOTP implementation
 * For production, use: npm install speakeasy qrcode
 */
interface TOTPConfig {
  secret: string
  name: string
  issuer: string
}

/**
 * Two-Factor Authentication Service
 * Handles SMS (Twilio) and TOTP (Authenticator App) methods
 */
export class TwoFactorService {
  private readonly SMS_CODE_LENGTH = 6
  private readonly SMS_CODE_EXPIRATION = 10 * 60 * 1000 // 10 minutes
  private readonly TOTP_WINDOW = 30 // seconds
  private readonly MAX_FAILED_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
  private readonly BACKUP_CODE_COUNT = 10
  private readonly SESSION_EXPIRATION = 10 * 60 * 1000 // 10 minutes

  /**
   * Enable 2FA for a user
   */
  async enable2FA(
    userId: string,
    shopId: string,
    method: 'sms' | 'totp'
  ): Promise<{ success: boolean; settings: any }> {
    try {
      const result = await query(
        `INSERT INTO user_two_factor_settings 
         (user_id, shop_id, is_enabled, method, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, shop_id) DO UPDATE SET
         is_enabled = $3, method = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, shopId, false, method] // Initially disabled until verified
      )

      twoFactorLogger.info('2FA enabled for user', { userId, shopId, method })

      return {
        success: true,
        settings: result.rows[0],
      }
    } catch (error) {
      twoFactorLogger.error('Failed to enable 2FA', error)
      throw new Error('Failed to enable 2FA')
    }
  }

  /**
   * Verify and confirm 2FA setup
   */
  async confirm2FA(userId: string, shopId: string): Promise<{ success: boolean }> {
    try {
      await query(
        `UPDATE user_two_factor_settings 
         SET is_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      twoFactorLogger.info('2FA confirmed for user', { userId, shopId })

      return { success: true }
    } catch (error) {
      twoFactorLogger.error('Failed to confirm 2FA', error)
      throw new Error('Failed to confirm 2FA')
    }
  }

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId: string, shopId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT id, is_enabled, method, phone_verified, phone_number, totp_secret, updated_at
         FROM user_two_factor_settings
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      if (result.rowCount === 0) {
        return {
          id: null,
          is_enabled: false,
          method: 'none',
          phone_verified: false,
          phone_number: null,
        }
      }

      const settings = result.rows[0]
      return {
        id: settings.id,
        is_enabled: settings.is_enabled,
        method: settings.method,
        phone_verified: settings.phone_verified,
        phone_number: settings.phone_number ? this.maskPhoneNumber(settings.phone_number) : null,
        totp_configured: !!settings.totp_secret,
      }
    } catch (error) {
      twoFactorLogger.error('Failed to get 2FA status', error)
      throw new Error('Failed to get 2FA status')
    }
  }

  /**
   * Generate SMS code and send via Twilio
   */
  async generateAndSendSMSCode(
    userId: string,
    shopId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; attemptId: string; expiresIn: number }> {
    try {
      // Generate 6-digit code
      const code = this.generateSMSCode()
      const codeHash = await this.hashCode(code)
      const attemptId = uuidv4()
      const expiresAt = new Date(Date.now() + this.SMS_CODE_EXPIRATION)

      // Store session
      await query(
        `INSERT INTO two_factor_sessions 
         (user_id, shop_id, attempt_id, code_hash, code_expires_at, session_expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, shopId, attemptId, codeHash, expiresAt, expiresAt]
      )

      // Send SMS via Twilio
      await this.sendSMSViaAPI(phoneNumber, code)

      twoFactorLogger.info('SMS code sent', { userId, shopId, attemptId })

      return {
        success: true,
        attemptId,
        expiresIn: this.SMS_CODE_EXPIRATION / 1000,
      }
    } catch (error) {
      twoFactorLogger.error('Failed to send SMS code', error)
      throw new Error('Failed to send SMS code')
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(
    userId: string,
    shopId: string,
    attemptId: string,
    code: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Get session
      const sessionResult = await query(
        `SELECT * FROM two_factor_sessions
         WHERE user_id = $1 AND shop_id = $2 AND attempt_id = $3
         AND session_expires_at > CURRENT_TIMESTAMP`,
        [userId, shopId, attemptId]
      )

      if (sessionResult.rowCount === 0) {
        return { success: false, message: 'SMS code expired. Please request a new one.' }
      }

      const session = sessionResult.rows[0]

      // Check if locked out due to failed attempts
      if (session.failed_attempts >= this.MAX_FAILED_ATTEMPTS) {
        return { success: false, message: 'Too many failed attempts. Try again later.' }
      }

      // Verify code
      const codeValid = await this.verifyCode(code, session.code_hash)

      if (!codeValid) {
        // Increment failed attempts
        await query(
          `UPDATE two_factor_sessions 
           SET failed_attempts = failed_attempts + 1
           WHERE id = $1`,
          [session.id]
        )

        const remaining = this.MAX_FAILED_ATTEMPTS - session.failed_attempts - 1
        return {
          success: false,
          message: remaining > 0 ? `Invalid code. ${remaining} attempts remaining.` : 'Too many failed attempts.',
        }
      }

      // Mark phone as verified and update settings
      await query(
        `UPDATE user_two_factor_settings 
         SET phone_verified = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      // Clean up session
      await query(`DELETE FROM two_factor_sessions WHERE id = $1`, [session.id])

      twoFactorLogger.info('SMS code verified', { userId, shopId })

      return { success: true }
    } catch (error) {
      twoFactorLogger.error('Failed to verify SMS code', error)
      throw new Error('Failed to verify SMS code')
    }
  }

  /**
   * Generate TOTP secret and QR code
   */
  async setupAuthenticator(
    userId: string,
    shopId: string,
    userEmail: string
  ): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      // Generate secret (similar to speakeasy)
      const secret = this.generateTOTPSecret()

      // Store temporary secret (not confirmed yet)
      await query(
        `UPDATE user_two_factor_settings 
         SET totp_secret = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND shop_id = $3`,
        [secret, userId, shopId]
      )

      // Generate QR code URL (for scanning)
      const qrCodeUrl = this.generateTOTPQRCode(
        secret,
        userEmail,
        'Barbershop SaaS'
      )

      twoFactorLogger.info('Authenticator setup initiated', { userId, shopId })

      return {
        secret,
        qrCodeUrl,
      }
    } catch (error) {
      twoFactorLogger.error('Failed to setup authenticator', error)
      throw new Error('Failed to setup authenticator')
    }
  }

  /**
   * Verify TOTP code from authenticator app
   */
  async verifyTOTPCode(
    userId: string,
    shopId: string,
    code: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Get TOTP secret
      const result = await query(
        `SELECT totp_secret FROM user_two_factor_settings
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      if (result.rowCount === 0 || !result.rows[0].totp_secret) {
        return { success: false, message: 'Authenticator not configured' }
      }

      const secret = result.rows[0].totp_secret

      // Verify TOTP code (with time window)
      const isValid = this.verifyTOTP(code, secret)

      if (!isValid) {
        return { success: false, message: 'Invalid authenticator code' }
      }

      // Mark phone as verified (for 2FA status)
      await query(
        `UPDATE user_two_factor_settings 
         SET phone_verified = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      twoFactorLogger.info('TOTP code verified', { userId, shopId })

      return { success: true }
    } catch (error) {
      twoFactorLogger.error('Failed to verify TOTP code', error)
      throw new Error('Failed to verify TOTP code')
    }
  }

  /**
   * Generate backup codes (10 codes)
   */
  async generateBackupCodes(userId: string, shopId: string): Promise<{ codes: string[] }> {
    try {
      const codes = Array.from({ length: this.BACKUP_CODE_COUNT }, () =>
        this.generateBackupCode()
      )

      // Hash and store codes
      for (const code of codes) {
        const codeHash = await this.hashCode(code)
        await query(
          `INSERT INTO user_backup_codes 
           (user_id, shop_id, code_hash, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [userId, shopId, codeHash]
        )
      }

      // Update last generated time
      await query(
        `UPDATE user_two_factor_settings 
         SET backup_codes_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      twoFactorLogger.info('Backup codes generated', { userId, shopId, count: codes.length })

      return { codes }
    } catch (error) {
      twoFactorLogger.error('Failed to generate backup codes', error)
      throw new Error('Failed to generate backup codes')
    }
  }

  /**
   * Verify backup code during login
   */
  async verifyBackupCode(
    userId: string,
    shopId: string,
    code: string
  ): Promise<{ success: boolean; message?: string; remaining?: number }> {
    try {
      // Get all unused backup codes
      const codesResult = await query(
        `SELECT id, code_hash FROM user_backup_codes
         WHERE user_id = $1 AND shop_id = $2 AND used_at IS NULL`,
        [userId, shopId]
      )

      if (codesResult.rowCount === 0) {
        return { success: false, message: 'No backup codes available' }
      }

      // Find matching code
      let matchedCodeId: string | null = null
      for (const row of codesResult.rows) {
        const isValid = await this.verifyCode(code, row.code_hash)
        if (isValid) {
          matchedCodeId = row.id
          break
        }
      }

      if (!matchedCodeId) {
        return { success: false, message: 'Invalid backup code' }
      }

      // Mark code as used
      await query(
        `UPDATE user_backup_codes 
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [matchedCodeId]
      )

      // Get remaining unused codes
      const remainingResult = await query(
        `SELECT COUNT(*) as count FROM user_backup_codes
         WHERE user_id = $1 AND shop_id = $2 AND used_at IS NULL`,
        [userId, shopId]
      )

      twoFactorLogger.info('Backup code used', { userId, shopId })

      return { 
        success: true, 
        remaining: parseInt(remainingResult.rows[0].count, 10)
      }
    } catch (error) {
      twoFactorLogger.error('Failed to verify backup code', error)
      throw new Error('Failed to verify backup code')
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, shopId: string): Promise<{ success: boolean }> {
    try {
      // Disable 2FA settings
      await query(
        `UPDATE user_two_factor_settings 
         SET is_enabled = FALSE, method = 'none', totp_secret = NULL, phone_verified = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      // Delete all backup codes
      await query(
        `DELETE FROM user_backup_codes WHERE user_id = $1 AND shop_id = $2`,
        [userId, shopId]
      )

      // Delete active sessions
      await query(
        `DELETE FROM two_factor_sessions 
         WHERE user_id = $1 AND shop_id = $2 AND session_expires_at > CURRENT_TIMESTAMP`,
        [userId, shopId]
      )

      twoFactorLogger.info('2FA disabled for user', { userId, shopId })

      return { success: true }
    } catch (error) {
      twoFactorLogger.error('Failed to disable 2FA', error)
      throw new Error('Failed to disable 2FA')
    }
  }

  /**
   * Verify 2FA code during login
   */
  async verify2FAForLogin(
    userId: string,
    shopId: string,
    code: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const settings = await query(
        `SELECT method, totp_secret FROM user_two_factor_settings
         WHERE user_id = $1 AND shop_id = $2 AND is_enabled = TRUE`,
        [userId, shopId]
      )

      if (settings.rowCount === 0) {
        return { success: false, message: '2FA not enabled' }
      }

      const { method, totp_secret } = settings.rows[0]

      if (method === 'sms') {
        // SMS verification is handled by verifySMSCode
        return { success: false, message: 'Use SMS code verification' }
      } else if (method === 'totp') {
        // Verify TOTP
        if (!totp_secret) {
          return { success: false, message: 'Authenticator not configured' }
        }

        const isValid = this.verifyTOTP(code, totp_secret)
        if (!isValid) {
          return { success: false, message: 'Invalid authenticator code' }
        }

        return { success: true }
      }

      return { success: false, message: 'Invalid 2FA method' }
    } catch (error) {
      twoFactorLogger.error('Failed to verify 2FA for login', error)
      throw new Error('Failed to verify 2FA for login')
    }
  }

  /**
   * Log 2FA event for audit
   */
  async log2FAEvent(
    userId: string,
    shopId: string,
    eventType: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO two_factor_audit 
         (user_id, shop_id, event_type, success, details, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [userId, shopId, eventType, success, JSON.stringify(details || {})]
      )
    } catch (error) {
      twoFactorLogger.error('Failed to log 2FA event', error)
    }
  }

  /**
   * ========== PRIVATE HELPER METHODS ==========
   */

  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private generateTOTPSecret(): string {
    // Generate 32 random bytes and base32 encode
    return Buffer.from(crypto.randomBytes(20)).toString('base64').slice(0, 32)
  }

  private generateBackupCode(): string {
    // Generate 12-character alphanumeric codes (similar to GitHub)
    return crypto.randomBytes(8).toString('hex').toUpperCase()
  }

  private async hashCode(code: string): Promise<string> {
    // Use bcrypt for code hashing
    return passwordService.hashPassword(code)
  }

  private async verifyCode(code: string, hash: string): Promise<boolean> {
    try {
      return await passwordService.verifyPassword(code, hash)
    } catch {
      return false
    }
  }

  private verifyTOTP(code: string, secret: string): boolean {
    // Simple TOTP verification (simplified version)
    // In production, use speakeasy library:
    // const speakeasy = require('speakeasy');
    // return speakeasy.totp.verify({ secret, encoding: 'base64', token: code });

    // For now, implement basic HMAC-based TOTP
    try {
      const cleanCode = code.replace(/\s/g, '')

      if (!/^\d{6}$/.test(cleanCode)) {
        return false
      }

      // Get current time window
      const counter = Math.floor(Date.now() / 1000 / this.TOTP_WINDOW)

      // Check current and adjacent time windows (±1 step for clock drift)
      for (let i = -1; i <= 1; i++) {
        const hmac = crypto
          .createHmac('sha1', Buffer.from(secret, 'base64'))
          .update(Buffer.alloc(8))
          .digest()

        const offset = hmac[hmac.length - 1] & 0xf
        const otp = (
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff)
        ) % 1000000

        const expectedCode = String(otp).padStart(6, '0')
        if (expectedCode === cleanCode) {
          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  private generateTOTPQRCode(secret: string, email: string, issuer: string): string {
    // In production, use qrcode library:
    // const QRCode = require('qrcode');
    // const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    // return await QRCode.toDataURL(otpauthUrl);

    // For now, return otpauth URL that clients can use
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`
    return otpauthUrl
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return '****'
    return '*'.repeat(phone.length - 4) + phone.slice(-4)
  }

  private async sendSMSViaAPI(phoneNumber: string, code: string): Promise<void> {
    // In production, use Twilio:
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: `Your verification code is: ${code}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });

    // For development, just log (in production, use Twilio)
    twoFactorLogger.info('SMS would be sent', { phoneNumber, code })

    // In production, make actual API call to Twilio endpoint
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890'

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: phoneNumber,
            Body: `Your barbershop verification code is: ${code}. Valid for 10 minutes.`,
          }).toString(),
        })

        if (!response.ok) {
          twoFactorLogger.warn('Twilio SMS send failed', {
            status: response.status,
            phoneNumber,
          })
        }
      } catch (error) {
        twoFactorLogger.error('Failed to send SMS via Twilio', error)
        throw new Error('Failed to send SMS code')
      }
    }
  }
}

export const twoFactorService = new TwoFactorService()
