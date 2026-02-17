/**
 * Analytics Provider
 * React context provider for analytics service
 * Wraps the app with analytics functionality
 */

'use client';

import React, { createContext, useEffect, ReactNode } from 'react';
import { initializeAnalytics, getAnalytics, AnalyticsService } from '@/lib/analytics';
import { AnalyticsConfig } from '@/lib/analytics/types';

interface AnalyticsContextType {
  analytics: AnalyticsService | null;
  isReady: boolean;
}

export const AnalyticsContext = createContext<AnalyticsContextType>({
  analytics: null,
  isReady: false,
});

interface AnalyticsProviderProps {
  children: ReactNode;
  config: AnalyticsConfig;
}

export function AnalyticsProvider({ children, config }: AnalyticsProviderProps) {
  const [isReady, setIsReady] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<AnalyticsService | null>(null);

  useEffect(() => {
    // Initialize analytics on mount
    const analyticsService = initializeAnalytics(config);
    setAnalytics(analyticsService);
    setIsReady(true);

    // Track page view on mount
    analyticsService.trackPageView(
      typeof window !== 'undefined' ? window.location.href : '',
      typeof document !== 'undefined' ? document.title : '',
    );

    // Track page view on route change
    const handlePopState = () => {
      analyticsService.trackPageView(
        window.location.href,
        document.title,
      );
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [config]);

  return (
    <AnalyticsContext.Provider value={{ analytics, isReady }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * Hook to access analytics context
 */
export function useAnalyticsContext() {
  const context = React.useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
}
