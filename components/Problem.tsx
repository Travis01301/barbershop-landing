export default function Problem() {
  const problems = [
    {
      icon: "📞",
      title: "Missing Calls",
      description: "Lost $500+ this month from calls you couldn't answer",
      stat: "40% of calls"
    },
    {
      icon: "❌",
      title: "No-Shows",
      description: "Empty chairs cost you $200-300 per day in lost revenue",
      stat: "25% no-show rate"
    },
    {
      icon: "📝",
      title: "Double Bookings",
      description: "Angry customers and chaos when you accidentally overbook",
      stat: "Weekly headaches"
    },
    {
      icon: "⏰",
      title: "After-Hours Requests",
      description: "Customers booking with competitors while you're closed",
      stat: "Lost opportunities"
    }
  ]

  return (
    <section className="py-24 bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold mb-6 border border-red-500/50">
            THE PROBLEM
          </span>
          <h2 className="text-5xl sm:text-6xl font-black mb-6 text-white">
            Are You Losing <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-pink-400">Thousands Every Month?</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Phone-only booking is costing barbershops serious money in lost revenue
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, idx) => (
            <div 
              key={idx} 
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-xl border border-slate-700/50 hover:border-red-500/50 transition-all hover:shadow-lg hover:shadow-red-500/10"
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform">
                {problem.icon}
              </div>
              <div className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold mb-4 border border-red-500/50">
                {problem.stat}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{problem.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{problem.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-20 bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 rounded-xl p-8 sm:p-12 text-center backdrop-blur-sm">
          <p className="text-3xl sm:text-4xl font-black text-white mb-4">
            💸 Average barbershop loses <span className="text-red-400">$2,000+/month</span>
          </p>
          <p className="text-slate-300 text-lg mb-6">from missed bookings and no-shows</p>
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all cursor-pointer">
            See How Much You're Losing
          </div>
        </div>
      </div>
    </section>
  )
}
