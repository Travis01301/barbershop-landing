/**
 * useAnalytics Hook
 * Custom hook for tracking analytics events in components
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useAnalyticsContext } from '@/components/providers/AnalyticsProvider';
import { AnalyticsService } from '@/lib/analytics';
import {
  AllAnalyticsEvents,
  CustomDimensions,
  CustomMetrics,
  SignUpEvent,
  LoginEvent,
  ShopCreatedEvent,
  AppointmentBookedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PromoCodeAppliedEvent,
  FeatureUsedEvent,
  PlanUpgradeEvent,
  PlanDowngradeEvent,
  ReviewSubmittedEvent,
  CommissionPayoutEvent,
  PortalBookingEvent,
  CTAClickEvent,
  PricingTierViewedEvent,
  NewsletterSignupEvent,
  PromoCodeEnteredEvent,
  WaitlistJoinedEvent,
  LoyaltyPointsEarnedEvent,
} from '@/lib/analytics/types';

export interface UseAnalyticsReturn {
  // Core methods
  trackEvent: (event: AllAnalyticsEvents) => void;
  setUserId: (userId: string) => void;
  setCustomDimensions: (dimensions: CustomDimensions) => void;
  setCustomMetrics: (metrics: CustomMetrics) => void;
  trackException: (description: string, fatal?: boolean) => void;

  // Convenience methods for common events
  trackSignUp: (
    signupMethod: 'email' | 'google' | 'apple',
    success: boolean,
    errorMessage?: string,
  ) => void;
  trackLogin: (
    loginMethod: 'email' | 'google' | 'apple',
    success: boolean,
    errorMessage?: string,
  ) => void;
  trackShopCreated: (shopName: string, barberCount?: number) => void;
  trackAppointmentBooked: (
    serviceType: string,
    barberName: string,
    bookingValue?: number,
    isFirstBooking?: boolean,
  ) => void;
  trackPaymentCompleted: (
    amount: number,
    currency?: string,
    planTier?: 'free' | 'pro' | 'enterprise',
  ) => void;
  trackPaymentFailed: (errorCode: string, errorMessage: string) => void;
  trackPromoCodeApplied: (
    promoCode: string,
    discountAmount: number,
    originalAmount: number,
  ) => void;
  trackFeatureUsed: (featureName: string, durationSeconds?: number) => void;
  trackPlanUpgrade: (
    fromTier: 'free' | 'pro' | 'enterprise',
    toTier: 'free' | 'pro' | 'enterprise',
  ) => void;
  trackCTAClick: (buttonText: string, pageSection?: string) => void;
  trackPricingTierViewed: (tier: 'free' | 'pro' | 'enterprise', price?: number) => void;
  trackPortalBooking: (shopId: string, serviceType: string) => void;

  // Utility
  isReady: boolean;
  analytics: AnalyticsService | null;
}

export function useAnalytics(): UseAnalyticsReturn {
  const { analytics, isReady } = useAnalyticsContext();

  const trackEvent = useCallback(
    (event: AllAnalyticsEvents) => {
      if (!analytics) {
        console.warn('[useAnalytics] Analytics not ready');
        return;
      }
      analytics.trackEvent(event);
    },
    [analytics],
  );

  const setUserId = useCallback(
    (userId: string) => {
      if (!analytics) return;
      analytics.setUserId(userId);
    },
    [analytics],
  );

  const setCustomDimensions = useCallback(
    (dimensions: CustomDimensions) => {
      if (!analytics) return;
      analytics.setCustomDimensions(dimensions);
    },
    [analytics],
  );

  const setCustomMetrics = useCallback(
    (metrics: CustomMetrics) => {
      if (!analytics) return;
      analytics.setCustomMetrics(metrics);
    },
    [analytics],
  );

  const trackException = useCallback(
    (description: string, fatal = false) => {
      if (!analytics) return;
      analytics.trackException(description, fatal);
    },
    [analytics],
  );

  // Convenience methods
  const trackSignUp = useCallback(
    (
      signupMethod: 'email' | 'google' | 'apple',
      success: boolean,
      errorMessage?: string,
    ) => {
      const event: SignUpEvent = {
        name: 'sign_up',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          signup_method: signupMethod,
          success,
          error_message: errorMessage,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackLogin = useCallback(
    (
      loginMethod: 'email' | 'google' | 'apple',
      success: boolean,
      errorMessage?: string,
    ) => {
      const event: LoginEvent = {
        name: 'login',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          login_method: loginMethod,
          success,
          error_message: errorMessage,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackShopCreated = useCallback(
    (shopName: string, barberCount?: number) => {
      const event: ShopCreatedEvent = {
        name: 'shop_created',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          shop_name: shopName,
          barber_count: barberCount,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackAppointmentBooked = useCallback(
    (
      serviceType: string,
      barberName: string,
      bookingValue?: number,
      isFirstBooking?: boolean,
    ) => {
      const event: AppointmentBookedEvent = {
        name: 'appointment_booked',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        customMetrics: {
          booking_value: bookingValue,
        },
        additionalParams: {
          service_type: serviceType,
          barber_name: barberName,
          is_first_booking: isFirstBooking,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPaymentCompleted = useCallback(
    (amount: number, currency = 'USD', planTier: 'free' | 'pro' | 'enterprise' = 'free') => {
      const event: PaymentCompletedEvent = {
        name: 'payment_completed',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        customMetrics: {
          revenue: amount,
        },
        additionalParams: {
          currency,
          plan_tier: planTier,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPaymentFailed = useCallback(
    (errorCode: string, errorMessage: string) => {
      const event: PaymentFailedEvent = {
        name: 'payment_failed',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          error_code: errorCode,
          error_message: errorMessage,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPromoCodeApplied = useCallback(
    (promoCode: string, discountAmount: number, originalAmount: number) => {
      const event: PromoCodeAppliedEvent = {
        name: 'promo_code_applied',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          promo_code: promoCode,
          discount_amount: discountAmount,
          original_amount: originalAmount,
          final_amount: originalAmount - discountAmount,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackFeatureUsed = useCallback(
    (featureName: string, durationSeconds?: number) => {
      const event: FeatureUsedEvent = {
        name: 'feature_used',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          feature_name: featureName as any,
          duration_seconds: durationSeconds,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPlanUpgrade = useCallback(
    (fromTier: 'free' | 'pro' | 'enterprise', toTier: 'free' | 'pro' | 'enterprise') => {
      const event: PlanUpgradeEvent = {
        name: 'plan_upgrade',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          from_tier: fromTier,
          to_tier: toTier,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackCTAClick = useCallback(
    (buttonText: string, pageSection?: string) => {
      const event: CTAClickEvent = {
        name: 'cta_click',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          button_text: buttonText as any,
          page_section: pageSection,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPricingTierViewed = useCallback(
    (tier: 'free' | 'pro' | 'enterprise', price?: number) => {
      const event: PricingTierViewedEvent = {
        name: 'pricing_tier_viewed',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        additionalParams: {
          pricing_tier: tier,
          price_amount: price,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  const trackPortalBooking = useCallback(
    (shopId: string, serviceType: string) => {
      const event: PortalBookingEvent = {
        name: 'portal_booking',
        timestamp: Date.now(),
        session_id: analytics?.getSessionId() || '',
        customDimensions: {
          shop_id: shopId,
        },
        additionalParams: {
          service_type: serviceType,
        },
      };
      trackEvent(event);
    },
    [trackEvent, analytics],
  );

  return {
    // Core
    trackEvent,
    setUserId,
    setCustomDimensions,
    setCustomMetrics,
    trackException,

    // Convenience
    trackSignUp,
    trackLogin,
    trackShopCreated,
    trackAppointmentBooked,
    trackPaymentCompleted,
    trackPaymentFailed,
    trackPromoCodeApplied,
    trackFeatureUsed,
    trackPlanUpgrade,
    trackCTAClick,
    trackPricingTierViewed,
    trackPortalBooking,

    // Utility
    isReady,
    analytics,
  };
}
