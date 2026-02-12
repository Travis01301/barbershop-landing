'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ActivateFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Validate token on load
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('No activation token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/activate?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setEmail(data.email)
          setLoading(false)
        } else {
          setError(data.message || 'Invalid activation link')
          setLoading(false)
        }
      } catch (err) {
        setError('Failed to validate token')
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (!password || !confirmPassword) {
      setError('Password is required')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          shopName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Activation failed')
      } else {
        setSuccess(true)
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setError('Failed to activate account')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-white">Validating activation link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome! 💈</h1>
          <p className="text-slate-600 mb-8">Complete your account setup</p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">✅ Account activated successfully!</p>
              <p className="text-green-600 text-sm mt-2">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {submitting ? 'Activating...' : 'Activate Account'}
                </button>
              </form>
            </>
          )}

          <p className="text-slate-600 text-sm text-center mt-6">
            Having issues? Contact{' '}
            <a href="mailto:support@barbershop.app" className="text-blue-600 hover:underline">
              support@barbershop.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivateFormContent />
    </Suspense>
  )
}
