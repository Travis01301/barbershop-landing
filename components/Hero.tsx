import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden flex items-center">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 w-full">
        <div className="max-w-4xl">
          {/* Animated Badge */}
          <div className="mb-8 inline-flex">
            <div className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 backdrop-blur-sm">
              <span className="text-sm font-semibold text-blue-300">⚡ The Modern Barbershop Platform</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tight">
            <span className="block text-white">Grow Your</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300">Barbershop Business</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-2xl leading-relaxed font-light">
            Online bookings, payment processing, customer analytics, and smart reminders—all in one beautiful platform built for modern barbers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 mb-12">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 transform"
            >
              Start Free Today
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-600 text-white font-semibold rounded-lg hover:border-blue-400 hover:bg-slate-800/50 transition-all duration-300"
            >
              See Features
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-8 pt-8 border-t border-slate-700/50">
            <div>
              <div className="text-3xl font-black text-blue-400">500+</div>
              <p className="text-slate-400 text-sm">Active Barbershops</p>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-400">50K</div>
              <p className="text-slate-400 text-sm">Bookings Monthly</p>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-400">4.9★</div>
              <p className="text-slate-400 text-sm">From 300+ Reviews</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
