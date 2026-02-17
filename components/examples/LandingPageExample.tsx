/**
 * Example: Landing Page with Analytics
 * Demonstrates tracking CTAs, pricing views, and other landing page events
 */

'use client';

import React, { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function LandingPageExample() {
  const {
    trackCTAClick,
    trackPricingTierViewed,
    trackEvent,
    trackPageView,
  } = useAnalytics();

  // Track initial page view
  useEffect(() => {
    trackPageView(window.location.href, document.title);
  }, []);

  const handleStartFreeTrialClick = () => {
    trackCTAClick('Start Free Trial', 'hero_section');
    // Navigate to signup
    window.location.href = '/signup';
  };

  const handleScheduleDemoClick = () => {
    trackCTAClick('Schedule Demo', 'cta_section');
    // Open demo booking modal
  };

  const handlePricingTierView = (tier: 'free' | 'pro' | 'enterprise', price: number) => {
    trackPricingTierViewed(tier, price);
  };

  const handleNewsletterSignup = async (email: string) => {
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        trackEvent({
          name: 'newsletter_signup',
          timestamp: Date.now(),
          session_id: '',
          additionalParams: {
            email_domain: email.split('@')[1],
          },
        });
      }
    } catch (error) {
      console.error('Newsletter signup failed:', error);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="hero-section text-center py-20">
        <h1 className="text-4xl font-bold mb-4">Barbershop Scheduling Made Easy</h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage appointments, staff, and customers with our all-in-one platform
        </p>
        <button
          onClick={handleStartFreeTrialClick}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
        >
          Start Free Trial
        </button>
      </section>

      {/* Features Section */}
      <section className="features-section py-20 bg-gray-50">
        <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              title: 'Easy Scheduling',
              description: 'Manage appointments with an intuitive calendar',
            },
            {
              title: 'Staff Management',
              description: 'Track barber schedules and availability',
            },
            {
              title: 'Customer Portal',
              description: 'Let customers book online 24/7',
            },
          ].map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { tier: 'free' as const, price: 0, name: 'Free' },
            { tier: 'pro' as const, price: 99, name: 'Pro' },
            { tier: 'enterprise' as const, price: 299, name: 'Enterprise' },
          ].map((pricing) => (
            <div
              key={pricing.tier}
              className="border rounded-lg p-6 text-center"
              onClick={() => handlePricingTierView(pricing.tier, pricing.price)}
            >
              <h3 className="text-2xl font-bold mb-2">{pricing.name}</h3>
              <p className="text-4xl font-bold mb-4">${pricing.price}</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded w-full mb-4">\n                Choose Plan\n              </button>
              <ul className=\"text-left space-y-2 text-gray-600\">\n                <li>✓ Feature 1</li>\n                <li>✓ Feature 2</li>\n                <li>✓ Feature 3</li>\n              </ul>\n            </div>\n          ))}\n        </div>\n      </section>\n\n      {/* FAQ Section */}\n      <section className=\"faq-section py-20 bg-gray-50\">\n        <h2 className=\"text-3xl font-bold mb-12 text-center\">FAQ</h2>\n        <div className=\"max-w-2xl mx-auto space-y-4\">\n          {[\n            { q: 'How do I get started?', a: 'Sign up for a free trial today!' },\n            { q: 'Can I upgrade later?', a: 'Yes, upgrade your plan anytime' },\n            { q: 'What payment methods do you accept?', a: 'We accept all major credit cards' },\n          ].map((item, index) => (\n            <div key={index} className=\"bg-white p-4 rounded-lg\">\n              <h4 className=\"font-semibold mb-2\">{item.q}</h4>\n              <p className=\"text-gray-600\">{item.a}</p>\n            </div>\n          ))}\n        </div>\n      </section>\n\n      {/* CTA Section */}\n      <section className=\"cta-section text-center py-20\">\n        <h2 className=\"text-3xl font-bold mb-4\">Ready to Get Started?</h2>\n        <button\n          onClick={handleScheduleDemoClick}\n          className=\"bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700\"\n        >\n          Schedule Demo\n        </button>\n      </section>\n\n      {/* Newsletter Section */}\n      <section className=\"newsletter-section bg-blue-50 py-12\">\n        <div className=\"max-w-md mx-auto text-center\">\n          <h3 className=\"text-2xl font-bold mb-4\">Stay Updated</h3>\n          <form\n            onSubmit={(e) => {\n              e.preventDefault();\n              const email = (e.target as HTMLFormElement).email.value;\n              handleNewsletterSignup(email);\n            }}\n            className=\"flex gap-2\"\n          >\n            <input\n              name=\"email\"\n              type=\"email\"\n              placeholder=\"Enter your email\"\n              className=\"flex-1 px-4 py-2 rounded\"\n              required\n            />\n            <button type=\"submit\" className=\"bg-blue-600 text-white px-6 py-2 rounded\">\n              Subscribe\n            </button>\n          </form>\n        </div>\n      </section>\n    </div>\n  );\n}\n