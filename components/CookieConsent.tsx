/**
 * Cookie Consent Component
 * GDPR-compliant consent banner
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { analytics } = useAnalytics();

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('analytics_consent');
    if (!consent) {
      // Show banner if no consent preference saved
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics_consent', 'accepted');
    if (analytics) {
      analytics.updateConsent(true);
    }
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('analytics_consent', 'denied');
    if (analytics) {
      analytics.updateConsent(false);
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">
            We use analytics to improve your experience
          </h3>
          <p className="text-sm text-gray-600">
            We use Google Analytics to understand how you use our service and make improvements.
            Your data is never shared with third parties.{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              Learn more
            </a>
            .
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
