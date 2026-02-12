export default function Features() {
  const features = [
    { 
      icon: "📅", 
      title: "24/7 Booking",
      desc: "Customers book instantly, 24/7. Reduce missed calls and phone tag forever."
    },
    { 
      icon: "⏰", 
      title: "Smart Reminders",
      desc: "Auto SMS & email reminders slash no-shows by 80%. More bookings, less waiting."
    },
    { 
      icon: "💰", 
      title: "Accept Payments",
      desc: "Stripe integration. Deposits, tips, full payments. All in one secure platform."
    },
    { 
      icon: "👥", 
      title: "Team Sync",
      desc: "Manage barbers, schedules, and calendars. Real-time updates across all devices."
    },
    { 
      icon: "📊", 
      title: "Analytics",
      desc: "See revenue, bookings, peak hours, and customer trends with beautiful charts."
    },
    { 
      icon: "⭐", 
      title: "Reviews",
      desc: "Collect customer ratings and build social proof. Increase bookings with trust."
    }
  ]

  return (
    <section id="features" className="py-24 bg-slate-950 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-black mb-6 text-white">
            Powerful Features,
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Built for Barbers</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need to run a modern barbershop. No complexity, just results.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="pt-12 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm mb-8">Trusted by growing barbershops nationwide</p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div className="text-slate-500 font-semibold">Fade Masters</div>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <div className="text-slate-500 font-semibold">The Barber Co</div>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <div className="text-slate-500 font-semibold">Prime Cuts</div>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <div className="text-slate-500 font-semibold">Urban Scissors</div>
          </div>
        </div>
      </div>
    </section>
  )
}
