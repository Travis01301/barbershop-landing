'use client'
import { useState } from 'react'

export default function SignUp() {
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        setSubmitted(true)
      } else {
        alert('Error saving signup. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving signup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-xl dark:shadow-dark-card text-center border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Thank You!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
            We received your information and will contact you within 24 hours to set up your account.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">Check your email for confirmation</p>
          </div>
          <a href="/" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition-all shadow-md dark:shadow-dark-card transform hover:-translate-y-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 flex items-center">
      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-xl dark:shadow-dark-card border border-slate-200 dark:border-slate-700">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Start Free Trial</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">7 days free, no credit card needed</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">Shop Name *</label>
            <input
              type="text"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:bg-slate-50 dark:disabled:bg-slate-800"
              value={formData.shopName}
              onChange={(e) => setFormData({...formData, shopName: e.target.value})}
              placeholder="Joe's Barbershop"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">Your Name *</label>
            <input
              type="text"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:bg-slate-50 dark:disabled:bg-slate-800"
              value={formData.ownerName}
              onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">Email *</label>
            <input
              type="email"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:bg-slate-50 dark:disabled:bg-slate-800"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-wide">Phone *</label>
            <input
              type="tel"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition disabled:bg-slate-50 dark:disabled:bg-slate-800"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(555) 123-4567"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white py-3 rounded-lg font-bold transition-all shadow-md dark:shadow-dark-card transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Free Trial
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6 leading-relaxed">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
