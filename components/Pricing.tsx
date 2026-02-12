import Link from 'next/link'

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "30",
      description: "Perfect for solo barbers",
      features: [
        "1-2 barbers",
        "Unlimited bookings",
        "SMS & email reminders",
        "Mobile app access",
        "Email support"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional", 
      price: "50",
      description: "Most popular for growing shops",
      features: [
        "3-5 barbers",
        "Everything in Starter",
        "Custom branding",
        "Priority support",
        "Advanced analytics",
        "Calendar integrations"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "100", 
      description: "For established barbershops",
      features: [
        "6+ barbers",
        "Everything in Professional",
        "Multiple locations",
        "API access",
        "Dedicated account manager",
        "Custom integrations"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ]

  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 text-white">
            Simple, Transparent
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Pricing for Everyone</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            30-day free trial. No credit card. Cancel anytime. Grow at your own pace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto lg:gap-6">
          {plans.map((plan, idx) => (
            <div 
              key={idx}
              className={`relative rounded-2xl transition-all duration-300 ${
                plan.popular 
                  ? 'md:scale-105 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 shadow-2xl' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 hover:border-slate-600'
              } hover:-translate-y-2`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                    ⭐ MOST POPULAR
                  </span>
                </div>
              )}

              <div className="p-8 sm:p-10">
                <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-8">{plan.description}</p>
                
                <div className="mb-8">
                  <span className="text-6xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>

                <Link
                  href="/signup"
                  className={`block text-center py-3 px-6 rounded-lg font-bold text-lg transition-all mb-8 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-2xl hover:shadow-blue-500/50'
                      : 'bg-slate-700/50 text-white border border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="space-y-4 border-t border-slate-700/50 pt-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Money-back guarantee */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900/50 border border-slate-700/50 rounded-full">
            <span className="text-2xl">🛡️</span>
            <span className="text-slate-300 font-semibold">30-Day Money-Back Guarantee</span>
          </div>
        </div>
      </div>
    </section>
  )
}
