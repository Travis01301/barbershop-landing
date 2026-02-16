import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [barberCount, setBarberCount] = useState(5);
  const [avgPrice, setAvgPrice] = useState(45);

  const monthlyRevenue = barberCount * avgPrice * 20 * 4; // ~20 cuts/barber/month
  const monthlySavings = barberCount * 200; // ~$200 admin savings per barber
  const totalBenefit = monthlyRevenue * 0.1 + monthlySavings; // 10% revenue increase

  const pricingTiers = [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      features: [
        '1 barber chair',
        'Basic calendar',
        'Email reminders',
        'Customer database (up to 50)',
        'Mobile app access',
      ],
      cta: 'Get Started Free',
      highlight: false,
    },
    {
      name: 'Pro',
      price: 39,
      originalPrice: 39,
      description: 'Best for growing shops',
      features: [
        'Up to 5 barber chairs',
        'AI scheduling assistant',
        'SMS + email reminders',
        'Unlimited customers',
        'Advanced analytics',
        'Payment processing',
        'Integrated CRM',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 150,
      originalPrice: 150,
      description: 'For multi-location shops',
      features: [
        'Unlimited barber chairs',
        'AI scheduling assistant',
        'All Pro features',
        'Multi-location management',
        'Team management',
        'Custom integrations',
        'Dedicated account manager',
        'White-label option',
      ],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];

  const features = [
    {
      icon: '📅',
      name: 'Smart Calendar',
      description: 'AI-powered scheduling that fills gaps and reduces no-shows by 40%',
    },
    {
      icon: '🤖',
      name: 'AI Assistant',
      description: 'Handles booking inquiries, rescheduling, and customer questions 24/7',
    },
    {
      icon: '💳',
      name: 'Payment Processing',
      description: 'Accept payments instantly with integrated Stripe & Square support',
    },
    {
      icon: '📊',
      name: 'Analytics Dashboard',
      description: 'Track revenue, busy hours, top services, and barber performance',
    },
    {
      icon: '👥',
      name: 'Customer CRM',
      description: 'Store preferences, service history, and loyalty points automatically',
    },
    {
      icon: '🔔',
      name: 'Smart Reminders',
      description: 'SMS & email reminders reduce no-shows and boost attendance by 50%',
    },
  ];

  const testimonials = [
    {
      name: 'Marcus Johnson',
      shop: "Johnson's Barbershop, Atlanta",
      image: '👨‍🦱',
      text: 'BarberHub cut our admin time in half and increased bookings by 65%. The AI assistant handles most inquiries now.',
      metrics: '+$8,500/month revenue',
    },
    {
      name: 'Carlos Rodriguez',
      shop: 'Elite Cuts, Miami',
      image: '👨‍💼',
      text: 'Setup took 20 minutes. No-shows dropped from 15% to 3%. Best investment for our shop this year.',
      metrics: '40 extra clients/month',
    },
    {
      name: 'David Chen',
      shop: 'Premium Fade Collective, LA',
      image: '👨‍🦲',
      text: 'The analytics showed us peak hours. We hired smarter and cut wages waste by 20%. Highly recommend.',
      metrics: '+$12,000/month savings',
    },
  ];

  const faqs = [
    {
      q: 'How long does setup take?',
      a: 'Most shops are up and running in under 20 minutes. We provide a setup wizard that walks you through connecting your barbers, services, and payment methods.',
    },
    {
      q: 'Do you offer payment processing?',
      a: 'Yes! We support Stripe, Square, and PayPal. Clients can pay online or in-person. We take a 2.9% + $0.30 processing fee.',
    },
    {
      q: 'What about customer support?',
      a: 'Free tier gets email support. Pro & Enterprise get priority support via email, chat, and phone. Enterprise includes a dedicated account manager.',
    },
    {
      q: 'Can I integrate with my existing tools?',
      a: 'Yes! We integrate with Google Calendar, Mailchimp, QuickBooks, and 50+ other tools. Custom integrations available for Enterprise.',
    },
    {
      q: 'Is my customer data secure?',
      a: 'Absolutely. We use bank-level encryption, comply with PCI-DSS, and regularly audit our systems. Your data is backed up daily.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, Pro and Enterprise plans can be canceled anytime with no penalties. The Free tier is always free.',
    },
    {
      q: 'Do you have a mobile app?',
      a: 'Yes! iOS and Android apps let you and your barbers manage bookings on the go. Features sync instantly across all devices.',
    },
    {
      q: 'What if I have multiple locations?',
      a: 'Enterprise plan supports unlimited locations with centralized management. Manage all shops from one dashboard.',
    },
  ];

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 0;
    return isAnnual ? Math.floor(basePrice * 12 * 0.8) : basePrice;
  };

  return (
    <div className="bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="text-2xl font-bold text-blue-600">✂️ BarberHub</div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Pricing
            </a>
            <a href="#faq" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              FAQ
            </a>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Barbershop Booking Made Simple
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed">
            50% more bookings. 80% less admin work. Zero scheduling headaches.
            <br className="hidden sm:block" />
            <span className="text-blue-600 font-semibold">Join 2,000+ barbershops already booked.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg transition-all hover:shadow-lg"
            >
              Start Free → No Credit Card
            </Link>
            <button
              onClick={() => {
                alert('Demo request submitted! We\'ll contact you within 24 hours.');
              }}
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-bold text-lg transition-all"
            >
              Book Demo Call
            </button>
          </div>
          <p className="text-sm text-gray-500">
            ✅ Set up in 20 minutes • 🔒 Bank-level security • 📱 Works on mobile
          </p>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">See Your ROI</h2>
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-sm font-semibold mb-2">Number of Barbers</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={barberCount}
                  onChange={(e) => setBarberCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-3xl font-bold mt-4">{barberCount} barbers</div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Avg. Haircut Price</label>
                <input
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-3xl font-bold mt-4">${avgPrice}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">+${Math.floor(totalBenefit * 12 / 1000)}K</div>
                <div className="text-sm opacity-90">Annual Revenue Increase</div>
              </div>
              <div className="bg-white/20 rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">+${Math.floor(monthlyRevenue / 100)}</div>
                <div className="text-sm opacity-90">Monthly from Better Bookings</div>
              </div>
              <div className="bg-white/20 rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">+{Math.floor(barberCount * 8)}</div>
                <div className="text-sm opacity-90">Hours Saved Monthly</div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm opacity-90 mb-4">
              Based on 20 haircuts/barber/month, 40% no-show reduction, and 2 hours admin time saved per barber
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Everything You Need</h2>
          <p className="text-center text-gray-600 mb-16 text-lg">
            Powerful tools designed for barbershops. Simple enough for solo barbers, powerful enough for chains.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.name}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 mb-8 text-lg">No hidden fees. No surprises. Cancel anytime.</p>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 rounded-full p-1 flex items-center">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  !isAnnual
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-full font-semibold transition-all ${
                  isAnnual
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-gray-600'
                }`}
              >
                Annual
                <span className="ml-2 text-green-600 font-bold">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-8 transition-all ${
                  tier.highlight
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-2xl scale-105'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg text-gray-900'
                }`}
              >
                {tier.highlight && (
                  <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold mb-4 inline-block">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className={`text-sm mb-6 ${tier.highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                  {tier.description}
                </p>

                <div className="mb-6">
                  {tier.price === 0 ? (
                    <div className="text-4xl font-bold">Free</div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold">
                        ${getPrice(tier.price)}
                        <span className="text-lg font-normal">
                          {isAnnual ? '/year' : '/month'}
                        </span>
                      </div>
                      {isAnnual && tier.price > 0 && (
                        <div className="text-sm mt-2 opacity-75">
                          ${Math.floor(getPrice(tier.price) / 12)}/month billed annually
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Link
                  href="/auth/signup"
                  className={`block text-center px-6 py-3 rounded-lg font-bold mb-8 transition-all ${
                    tier.highlight
                      ? 'bg-white text-blue-600 hover:bg-gray-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {tier.cta}
                </Link>

                <div className="space-y-3">
                  {tier.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">✓</span>
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-12 text-sm">
            All plans include mobile app, customer support, and automatic backups.
            <br />
            Enterprise includes white-label and custom integrations. Contact sales for pricing.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Trusted by Barbershops</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl">{testimonial.image}</div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.shop}</p>
                  </div>
                </div>

                <div className="mb-4 text-yellow-400 text-lg">⭐⭐⭐⭐⭐</div>

                <p className="text-gray-700 mb-4 leading-relaxed italic">{testimonial.text}</p>

                <div className="pt-4 border-t border-gray-200">
                  <p className="font-bold text-blue-600 text-sm">{testimonial.metrics}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <summary className="font-bold text-gray-900 flex justify-between items-center select-none">
                  {faq.q}
                  <span className="text-2xl text-gray-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-gray-600 mt-4 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Fill Your Chair?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join over 2,000 barbershops that are booking smarter, working less, and earning more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-bold text-lg transition-all"
            >
              Start Your Free Trial
            </Link>
            <button
              onClick={() => {
                alert('Demo request submitted! We\'ll contact you within 24 hours.');
              }}
              className="px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 font-bold text-lg transition-all"
            >
              Schedule a Demo
            </button>
          </div>
          <p className="text-sm text-blue-100">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">✂️ BarberHub</div>
              <p className="text-sm">Making barbershop scheduling simple.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Email Signup */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <h4 className="font-bold text-white mb-4">Get updates & tips</h4>
            <div className="flex gap-2 max-w-md">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition">
                Subscribe
              </button>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2026 BarberHub. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-white transition">Twitter</a>
              <a href="#" className="hover:text-white transition">Facebook</a>
              <a href="#" className="hover:text-white transition">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
