import {
  SECURITY_HEADERS,
  getAllowedCorsOrigins,
  isOriginAllowed,
} from '@/lib/security-headers'

describe('Security Headers', () => {
  beforeEach(() => {
    delete process.env.CORS_ALLOWED_ORIGINS
  })

  describe('SECURITY_HEADERS object', () => {
    it('should have CSP header', () => {
      expect(SECURITY_HEADERS['Content-Security-Policy']).toBeTruthy()
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain('default-src')
    })

    it('should have X-Frame-Options to prevent clickjacking', () => {
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
    })

    it('should have X-Content-Type-Options to prevent MIME sniffing', () => {
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    })

    it('should have HSTS header for HTTPS enforcement', () => {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age')
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('includeSubDomains')
    })

    it('should have Referrer-Policy header', () => {
      expect(SECURITY_HEADERS['Referrer-Policy']).toBeTruthy()
    })

    it('should have Permissions-Policy header', () => {
      expect(SECURITY_HEADERS['Permissions-Policy']).toBeTruthy()
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=()')
    })

    it('should allow Stripe and Gemini API in CSP connect-src', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy']
      expect(csp).toContain('https://api.stripe.com')
      expect(csp).toContain('https://generativelanguage.googleapis.com')
    })

    it('should protect against common web vulnerabilities', () => {
      // XSS
      expect(SECURITY_HEADERS['Content-Security-Policy']).toBeTruthy()
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBeTruthy()

      // Clickjacking
      expect(SECURITY_HEADERS['X-Frame-Options']).toBeTruthy()

      // MIME sniffing
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBeTruthy()

      // Man-in-the-middle
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBeTruthy()
    })

    it('should restrict dangerous features', () => {
      const permissions = SECURITY_HEADERS['Permissions-Policy']
      expect(permissions).toContain('geolocation=()')
      expect(permissions).toContain('microphone=()')
      expect(permissions).toContain('camera=()')
      expect(permissions).toContain('payment=()')
    })
  })

  describe('getAllowedCorsOrigins', () => {
    it('should return default origins when not configured', () => {
      const origins = getAllowedCorsOrigins()
      expect(origins).toContain('http://localhost:3000')
      expect(origins).toContain('http://localhost:3001')
    })

    it('should parse CORS_ALLOWED_ORIGINS from env', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com,https://app.example.com'
      const origins = getAllowedCorsOrigins()
      expect(origins).toContain('https://example.com')
      expect(origins).toContain('https://app.example.com')
    })

    it('should trim whitespace from origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = ' https://example.com , https://app.example.com '
      const origins = getAllowedCorsOrigins()
      expect(origins[0]).toBe('https://example.com')
      expect(origins[1]).toBe('https://app.example.com')
    })

    it('should return array of strings', () => {
      const origins = getAllowedCorsOrigins()
      expect(Array.isArray(origins)).toBe(true)
      expect(origins.every(o => typeof o === 'string')).toBe(true)
    })
  })

  describe('isOriginAllowed', () => {
    it('should return false for null origin', () => {
      expect(isOriginAllowed(null)).toBe(false)
    })

    it('should return true for allowed origins', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true)
    })

    it('should return false for disallowed origins', () => {
      expect(isOriginAllowed('https://evil.com')).toBe(false)
    })

    it('should check against configured origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://myapp.com'
      expect(isOriginAllowed('https://myapp.com')).toBe(true)
      expect(isOriginAllowed('http://localhost:3000')).toBe(false)
    })

    it('should be case-sensitive', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://Example.com'
      expect(isOriginAllowed('https://example.com')).toBe(false)
      expect(isOriginAllowed('https://Example.com')).toBe(true)
    })

    it('should require exact match', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com'
      expect(isOriginAllowed('https://example.com')).toBe(true)
      expect(isOriginAllowed('https://example.com/')).toBe(false)
      expect(isOriginAllowed('https://subdomain.example.com')).toBe(false)
    })
  })

  describe('Security Coverage', () => {
    it('should have all major security headers', () => {
      const requiredHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Permissions-Policy',
      ]

      requiredHeaders.forEach(header => {
        expect(SECURITY_HEADERS[header as keyof typeof SECURITY_HEADERS]).toBeTruthy()
      })
    })

    it('should have CSP that allows Stripe', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy']
      expect(csp.toLowerCase()).toContain('stripe')
    })

    it('should have CSP that allows Gemini API', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy']
      expect(csp.toLowerCase()).toContain('generativelanguage.googleapis.com')
    })

    it('should enforce HTTPS with preload', () => {
      const hsts = SECURITY_HEADERS['Strict-Transport-Security']
      expect(hsts).toContain('preload')
      expect(hsts).toContain('includeSubDomains')
    })

    it('should deny frame embedding', () => {
      const xFrame = SECURITY_HEADERS['X-Frame-Options']
      expect(xFrame).toBe('DENY')
    })

    it('should disable dangerous permissions', () => {
      const perms = SECURITY_HEADERS['Permissions-Policy']
      expect(perms).toContain('geolocation=()')
      expect(perms).toContain('usb=()')
      expect(perms).toContain('magnetometer=()')
    })
  })
})
