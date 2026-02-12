'use client'

import { useEffect, useState } from 'react'

interface Review {
  id: number
  rating: number
  comment: string | null
  customerName: string
  barberName: string
  createdAt: string
}

interface ReviewsDisplayProps {
  shopId: number
  barberId?: number
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-slate-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export function ReviewsDisplay({ shopId, barberId }: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        let url = `/api/reviews?shopId=${shopId}`
        if (barberId) {
          url += `&barberId=${barberId}`
        }

        const response = await fetch(url)
        const data = await response.json()

        if (data.success && data.reviews) {
          setReviews(data.reviews)
          if (data.reviews.length > 0) {
            const avg = data.reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.reviews.length
            setAverageRating(parseFloat(avg.toFixed(1)))
          }
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [shopId, barberId])

  if (loading) {
    return <div className="text-slate-500">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-600">No reviews yet. Book an appointment to leave the first one!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StarDisplay rating={Math.round(averageRating)} />
            <span className="text-2xl font-bold text-slate-900">{averageRating}</span>
            <span className="text-sm text-slate-600">({reviews.length} reviews)</span>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="p-4 border border-slate-200 rounded-lg bg-white hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-900">{review.customerName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <StarDisplay rating={review.rating} />
            </div>

            {review.comment && (
              <p className="text-slate-700 text-sm">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
