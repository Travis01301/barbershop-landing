'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export function PublicBarberProfile() {
  const params = useParams();
  const barberId = params.barberId as string;

  const [barber, setBarber] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchBarber = async () => {
      try {
        const response = await fetch(`/api/public/barbers/${barberId}`);
        const data = await response.json();

        if (data.success) {
          setBarber(data.barber);
        } else {
          setError(data.error || 'Barber not found');
        }
      } catch (err) {
        setError('Failed to load barber profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBarber();
  }, [barberId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !barber) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden mb-8">
        {/* Profile Section */}
        <div className="grid md:grid-cols-3 gap-8 p-8">
          {/* Photo */}
          {barber.profile_photo_url && (
            <div className="md:col-span-1">
              <Image
                src={barber.profile_photo_url}
                alt={barber.name}
                width={300}
                height={400}
                className="rounded-xl w-full object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className={barber.profile_photo_url ? 'md:col-span-2' : 'md:col-span-3'}>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">{barber.name}</h1>

            {/* Rating */}
            {barber.average_rating && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(barber.average_rating) ? 'fill-current' : 'fill-slate-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-lg font-bold text-slate-700">
                  {barber.average_rating.toFixed(1)} ({barber.review_count} reviews)
                </span>
              </div>
            )}

            {/* Bio */}
            {barber.bio && (
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{barber.bio}</p>
            )}

            {/* Specialties */}
            {barber.specialties && barber.specialties.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-wide font-semibold text-slate-500 mb-3">
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {barber.specialties.map((specialty: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {barber.upcomingAvailability && barber.upcomingAvailability.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wide font-semibold text-slate-500 mb-3">
                  Upcoming Availability
                </h3>
                <div className="flex flex-wrap gap-2">
                  {barber.upcomingAvailability.slice(0, 5).map((date: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm"
                    >
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Book Button */}
        <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-t border-slate-200 dark:border-slate-700 p-8">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl">
            Book with {barber.name.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Services */}
      {barber.services && barber.services.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Services</h2>
          <div className="space-y-4">
            {barber.services.map((service: any) => (
              <div
                key={service.id}
                className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 transition-all"
              >
                <div>
                  <h3 className="font-bold text-slate-900">{service.name}</h3>
                  <p className="text-sm text-slate-600">{service.duration_minutes} minutes</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">${service.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {barber.reviews && barber.reviews.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Customer Reviews</h2>
          <div className="space-y-6">
            {barber.reviews.map((review: any) => (
              <div key={review.id} className="border-b border-slate-200 dark:border-slate-700 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{review.customer_name}</p>
                    <div className="flex text-yellow-400 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'fill-current' : 'fill-slate-300'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                {review.comment && <p className="text-slate-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
