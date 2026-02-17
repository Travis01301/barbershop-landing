/**
 * Analytics Service
 * Manages GA4 event tracking, custom dimensions, and metrics
 * GDPR/CCPA compliant with consent management
 */

import {
  AllAnalyticsEvents,
  AnalyticsConfig,
  CustomDimensions,
  CustomMetrics,
} from './types';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private sessionId: string;
  private userId?: string;
  private customDimensions: CustomDimensions = {};
  private customMetrics: CustomMetrics = {};
  private consentGiven = false;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.initializeGA4();
    this.initializeConsent();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize GA4 with GTM if available
   */
  private initializeGA4(): void {
    if (typeof window === 'undefined') return;

    // GTM initialization
    if (this.config.gtmContainerId) {
      this.loadGTM();
    } else {
      // Direct GA4 initialization
      this.loadGA4Direct();
    }

    if (this.config.debugMode) {
      console.log('[Analytics] Initialized in debug mode', this.config);
    }
  }

  /**
   * Load Google Tag Manager
   */
  private loadGTM(): void {
    if (typeof window === 'undefined') return;

    const gtmId = this.config.gtmContainerId;
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(script1);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });
  }

  /**
   * Load GA4 directly
   */
  private loadGA4Direct(): void {
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.ga4PropertyId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', this.config.ga4PropertyId, {
      debug_mode: this.config.debugMode,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    window.gtag = gtag;
  }

  /**
   * Initialize consent management (GDPR/CCPA)
   */
  private initializeConsent(): void {
    if (!this.config.enableCookieConsent) {
      this.consentGiven = true;
      return;
    }

    // Check for stored consent
    const consent = localStorage.getItem('analytics_consent');
    if (consent === 'accepted') {
      this.consentGiven = true;
      this.updateConsent(true);
    } else if (consent === 'denied') {
      this.consentGiven = false;
      this.updateConsent(false);
    }
  }

  /**
   * Update GA4 consent status
   */
  updateConsent(granted: boolean): void {
    if (typeof window === 'undefined' || !window.gtag) return;

    this.consentGiven = granted;
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
    });

    localStorage.setItem('analytics_consent', granted ? 'accepted' : 'denied');

    if (this.config.debugMode) {
      console.log('[Analytics] Consent updated:', granted);
    }
  }

  /**
   * Set user ID (authenticated user)
   */
  setUserId(userId: string): void {
    this.userId = userId;
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('config', this.config.ga4PropertyId, {
      user_id: userId,
    });

    if (this.config.debugMode) {
      console.log('[Analytics] User ID set:', userId);
    }
  }

  /**
   * Set custom dimensions
   */
  setCustomDimensions(dimensions: CustomDimensions): void {
    this.customDimensions = { ...this.customDimensions, ...dimensions };
  }

  /**
   * Set custom metrics
   */
  setCustomMetrics(metrics: CustomMetrics): void {
    this.customMetrics = { ...this.customMetrics, ...metrics };
  }

  /**
   * Track analytics event
   */
  trackEvent(event: AllAnalyticsEvents): void {
    if (!this.consentGiven && this.config.enableCookieConsent) {
      if (this.config.debugMode) {
        console.log('[Analytics] Event blocked - consent not given:', event.name);
      }
      return;
    }

    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Analytics] GA4 not loaded, queueing event:', event.name);
      return;
    }

    const eventData = this.buildEventData(event);

    window.gtag('event', event.name, eventData);

    if (this.config.debugMode) {
      console.log('[Analytics] Event tracked:', event.name, eventData);
    }
  }

  /**
   * Build event data with custom dimensions and metrics
   */
  private buildEventData(event: AllAnalyticsEvents): Record<string, unknown> {
    const baseData: Record<string, unknown> = {
      session_id: this.sessionId,
      user_id: this.userId,
      timestamp: event.timestamp || Date.now(),
    };

    // Add custom dimensions
    const dimensions = event.customDimensions || this.customDimensions;
    if (Object.keys(dimensions).length > 0) {
      Object.entries(dimensions).forEach(([key, value]) => {
        baseData[`custom_dimension_${key}`] = value;
      });
    }

    // Add custom metrics
    const metrics = event.customMetrics || this.customMetrics;
    if (Object.keys(metrics).length > 0) {
      Object.entries(metrics).forEach(([key, value]) => {
        baseData[`custom_metric_${key}`] = value;
      });
    }

    // Add additional parameters
    if (event.additionalParams) {
      Object.entries(event.additionalParams).forEach(([key, value]) => {
        baseData[key] = value;
      });
    }

    return baseData;
  }

  /**
   * Track page view
   */
  trackPageView(location: string, title: string, referrer?: string): void {
    this.trackEvent({
      name: 'page_view',
      timestamp: Date.now(),
      session_id: this.sessionId,
      additionalParams: {
        page_location: location,
        page_title: title,
        page_referrer: referrer,
      },
    });
  }

  /**
   * Track exception/error
   */
  trackException(description: string, fatal = false): void {
    if (typeof window === 'undefined' || !window.gtag) return;

    window.gtag('event', 'exception', {
      description,
      fatal,
    });

    if (this.config.debugMode) {
      console.log('[Analytics] Exception tracked:', { description, fatal });
    }
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Check if consent is given
   */
  isConsentGiven(): boolean {
    return this.consentGiven;
  }
}

// Singleton instance
let analyticsInstance: AnalyticsService | null = null;

/**
 * Initialize or get analytics service
 */
export function initializeAnalytics(config: AnalyticsConfig): AnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService(config);
  }
  return analyticsInstance;
}

/**
 * Get analytics service instance
 */
export function getAnalytics(): AnalyticsService {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics first.');
  }
  return analyticsInstance;
}

export { AnalyticsService };
