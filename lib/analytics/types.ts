/**
 * Analytics Event Types
 * Comprehensive TypeScript definitions for all analytics events across the barbershop SaaS
 */

// User Types
export type UserType = 'shop_owner' | 'barber' | 'customer';
export type PlanTier = 'free' | 'pro' | 'enterprise';

// Custom Dimensions
export interface CustomDimensions {
  shop_id?: string;
  user_type?: UserType;
  plan_tier?: PlanTier;
  barber_id?: string;
  customer_id?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
}

// Custom Metrics
export interface CustomMetrics {
  revenue?: number;
  appointments_booked?: number;
  commission_amount?: number;
  booking_value?: number;
  wait_time_minutes?: number;
}

// Base Event Interface
export interface AnalyticsEvent {
  name: string;
  timestamp: number;
  session_id: string;
  user_id?: string;
  anonymousUserId?: string;
  customDimensions?: CustomDimensions;
  customMetrics?: CustomMetrics;
  additionalParams?: Record<string, unknown>;
}

// Landing Page Events
export interface PageViewEvent extends AnalyticsEvent {
  name: 'page_view';
  additionalParams?: {
    page_location?: string;
    page_title?: string;
    page_referrer?: string;
    section?: 'hero' | 'features' | 'pricing' | 'faq' | 'footer';
  };
}

export interface CTAClickEvent extends AnalyticsEvent {
  name: 'cta_click';
  additionalParams?: {
    button_name?: string;
    button_text?: 'Start Free Trial' | 'Schedule Demo' | 'Sign Up';
    page_section?: string;
    link_url?: string;
  };
}

export interface PricingTierViewedEvent extends AnalyticsEvent {
  name: 'pricing_tier_viewed';
  additionalParams?: {
    pricing_tier?: PlanTier;
    price_amount?: number;
    currency?: string;
  };
}

export interface NewsletterSignupEvent extends AnalyticsEvent {
  name: 'newsletter_signup';
  additionalParams?: {
    email_domain?: string;
    signup_source?: string;
  };
}

export interface PromoCodeEnteredEvent extends AnalyticsEvent {
  name: 'promo_code_entered';
  additionalParams?: {
    promo_code?: string;
    discount_amount?: number;
    discount_percentage?: number;
  };
}

// App User Events
export interface SignUpEvent extends AnalyticsEvent {
  name: 'sign_up';
  additionalParams?: {
    signup_method?: 'email' | 'google' | 'apple';
    success: boolean;
    error_message?: string;
  };
}

export interface LoginEvent extends AnalyticsEvent {
  name: 'login';
  additionalParams?: {
    login_method?: 'email' | 'google' | 'apple';
    success: boolean;
    error_message?: string;
  };
}

export interface ShopCreatedEvent extends AnalyticsEvent {
  name: 'shop_created';
  additionalParams?: {
    shop_name?: string;
    location?: string;
    barber_count?: number;
    initial_services?: number;
  };
}

// Appointment Events
export interface AppointmentBookedEvent extends AnalyticsEvent {
  name: 'appointment_booked';
  customMetrics?: CustomMetrics & {
    booking_value?: number;
  };
  additionalParams?: {
    service_type?: string;
    barber_name?: string;
    appointment_date?: string;
    appointment_time?: string;
    is_first_booking?: boolean;
  };
}

export interface AppointmentCancelledEvent extends AnalyticsEvent {
  name: 'appointment_cancelled';
  additionalParams?: {
    cancellation_reason?: string;
    refund_issued?: boolean;
    time_until_appointment?: string;
  };
}

export interface RecurringAppointmentCreatedEvent extends AnalyticsEvent {
  name: 'recurring_appointment_created';
  additionalParams?: {
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    service_type?: string;
    barber_id?: string;
    total_appointments?: number;
  };
}

// Payment Events
export interface PaymentCompletedEvent extends AnalyticsEvent {
  name: 'payment_completed';
  customMetrics?: CustomMetrics & {
    revenue?: number;
  };
  additionalParams?: {
    payment_method?: string;
    currency?: string;
    transaction_id?: string;
    plan_tier?: PlanTier;
    is_recurring?: boolean;
  };
}

export interface PaymentFailedEvent extends AnalyticsEvent {
  name: 'payment_failed';
  additionalParams?: {
    payment_method?: string;
    error_code?: string;
    error_message?: string;
    currency?: string;
    amount?: number;
  };
}

export interface PromoCodeAppliedEvent extends AnalyticsEvent {
  name: 'promo_code_applied';
  additionalParams?: {
    promo_code?: string;
    discount_amount?: number;
    discount_percentage?: number;
    original_amount?: number;
    final_amount?: number;
  };
}

// Plan Events
export interface PlanUpgradeEvent extends AnalyticsEvent {
  name: 'plan_upgrade';
  additionalParams?: {
    from_tier?: PlanTier;
    to_tier?: PlanTier;
    upgrade_cost?: number;
    currency?: string;
  };
}

export interface PlanDowngradeEvent extends AnalyticsEvent {
  name: 'plan_downgrade';
  additionalParams?: {
    from_tier?: PlanTier;
    to_tier?: PlanTier;
    refund_issued?: boolean;
    refund_amount?: number;
  };
}

// Feature Usage Events
export interface FeatureUsedEvent extends AnalyticsEvent {
  name: 'feature_used';
  additionalParams?: {
    feature_name?: 'recurring' | 'waitlist' | 'loyalty' | 'sms' | 'email' | 'analytics';
    feature_section?: string;
    duration_seconds?: number;
  };
}

// Communication Events
export interface EmailSentEvent extends AnalyticsEvent {
  name: 'email_sent';
  additionalParams?: {
    email_type?: 'promotional' | 'transactional' | 'reminder' | 'notification';
    recipient_count?: number;
    template_name?: string;
  };
}

export interface SMSSentEvent extends AnalyticsEvent {
  name: 'sms_sent';
  additionalParams?: {
    sms_type?: 'promotional' | 'reminder' | 'notification';
    recipient_count?: number;
  };
}

// Review Events
export interface ReviewSubmittedEvent extends AnalyticsEvent {
  name: 'review_submitted';
  additionalParams?: {
    rating?: number; // 1-5
    review_text?: string;
    platform?: 'in_app' | 'google' | 'external';
  };
}

// Payout Events
export interface CommissionPayoutEvent extends AnalyticsEvent {
  name: 'commission_payout';
  customMetrics?: CustomMetrics & {
    commission_amount?: number;
  };
  additionalParams?: {
    barber_id?: string;
    payout_method?: string;
    commission_period?: string;
    transaction_id?: string;
  };
}

// Portal Booking Events
export interface PortalBookingEvent extends AnalyticsEvent {
  name: 'portal_booking';
  additionalParams?: {
    shop_id?: string;
    barber_id?: string;
    service_type?: string;
    booking_source?: 'qr' | 'link' | 'search';
  };
}

export interface WaitlistJoinedEvent extends AnalyticsEvent {
  name: 'waitlist_joined';
  additionalParams?: {
    service_type?: string;
    preferred_barber?: string;
    queue_position?: number;
  };
}

export interface LoyaltyPointsEarnedEvent extends AnalyticsEvent {
  name: 'loyalty_points_earned';
  additionalParams?: {
    points_amount?: number;
    action_type?: 'booking' | 'review' | 'referral';
    loyalty_program?: string;
  };
}

// Union type of all events
export type AllAnalyticsEvents =
  | PageViewEvent
  | CTAClickEvent
  | PricingTierViewedEvent
  | NewsletterSignupEvent
  | PromoCodeEnteredEvent
  | SignUpEvent
  | LoginEvent
  | ShopCreatedEvent
  | AppointmentBookedEvent
  | AppointmentCancelledEvent
  | RecurringAppointmentCreatedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PromoCodeAppliedEvent
  | PlanUpgradeEvent
  | PlanDowngradeEvent
  | FeatureUsedEvent
  | EmailSentEvent
  | SMSSentEvent
  | ReviewSubmittedEvent
  | CommissionPayoutEvent
  | PortalBookingEvent
  | WaitlistJoinedEvent
  | LoyaltyPointsEarnedEvent;

// Analytics Configuration
export interface AnalyticsConfig {
  ga4PropertyId: string;
  gtmContainerId?: string;
  debugMode?: boolean;
  anonymousUserId?: string;
  enableCookieConsent?: boolean;
}
