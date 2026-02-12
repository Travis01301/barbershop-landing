'use client'

import { useState } from 'react'

interface ReviewFormProps {
  appointmentId: number
  customerId: number
  barberId: number
  shopId: number
  barberName: string
  onSuccess?: () => void
}

const StarRating = ({ rating, onChange }: { rating: number; onChange: (r: number) => void }) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-4xl transition-all transform hover:scale-110 ${
            star <= rating ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({
  appointmentId,
  customerId,
  barberId,
  shopId,
  barberName,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          customerId,
          barberId,
          shopId,
          rating,
          comment: comment || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onSuccess?.()
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit review')
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✨</div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h3>
        <p className="text-slate-600">Your review helps us improve and helps other customers choose quality barbers.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">How was your experience?</h3>
        <p className="text-sm text-slate-600 mb-4">
          Please rate your appointment with <span className="font-semibold">{barberName}</span>
        </p>
        <StarRating rating={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-900 mb-2">Comment (Optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your feedback about the service quality, barber's professionalism, cleanliness, etc."
          maxLength={500}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          rows={4}
        />
        <p className="text-xs text-slate-500 mt-1">{comment.length}/500 characters</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Submitting...
          </>
        ) : (
          <>
            <span>⭐ Submit Review</span>
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Your review is published immediately and helps other customers find quality barbers.
      </p>
    </form>
  )
}
