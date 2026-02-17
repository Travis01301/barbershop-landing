'use client'

import React from 'react'
import Link from 'next/link'
import { googleMapsService } from '@/lib/google-maps-service'

interface ShopMapProps {
  shopName: string
  address: string
  latitude: number
  longitude: number
  phoneNumber?: string
  hours?: string
  showEmbedded?: boolean
}

/**
 * Shop Map Component - Displays location on Google Map
 * Can show embedded map or just link to Google Maps
 */
export const ShopMap: React.FC<ShopMapProps> = ({
  shopName,
  address,
  latitude,
  longitude,
  phoneNumber,
  hours,
  showEmbedded = true,
}) => {
  const embedUrl = googleMapsService.getEmbedUrl(latitude, longitude)
  const directionsUrl = googleMapsService.getDirectionsUrl(latitude, longitude)
  const mapsLink = googleMapsService.getMapsLink(latitude, longitude)

  return (
    <div className="space-y-4">
      {/* Shop Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">{shopName}</h3>

        <div className="space-y-3">
          {/* Address */}
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-gray-600 dark:text-slate-400 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1 4.5 4.5 0 1-3.784 6.98A3.5 3.5 0 015.5 13z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p className="text-gray-900">{address}</p>
            </div>
          </div>

          {/* Phone */}
          {phoneNumber && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-slate-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.878 1.133v4.572a1 1 0 00.18.543l2.332 3.332c.062.09.181.18.296.18.114 0 .234-.09.296-.18l2.332-3.332a1 1 0 00.18-.543v-4.572l-1.878-1.133a1 1 0 01-.54-1.06l.74-4.435A1 1 0 0110.153 3h2.153a1 1 0 011 1v2a1 1 0 11-2 0V4h-2v2a1 1 0 11-2 0V3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <a
                  href={`tel:${phoneNumber}`}
                  className="text-blue-600 hover:underline"
                >
                  {phoneNumber}
                </a>
              </div>
            </div>
          )}

          {/* Hours */}
          {hours && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-gray-600 dark:text-slate-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-1.414 1.414a1 1 0 001.414 1.414L9 9.414V6z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-600">Hours</p>
                <p className="text-gray-900 dark:text-slate-100 whitespace-pre-line">{hours}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700 transition"
          >
            Get Directions
          </a>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 border-2 border-blue-600 text-blue-600 py-2 px-4 rounded-lg text-center hover:bg-blue-50 dark:bg-blue-900/20 transition"
          >
            View on Maps
          </a>
        </div>
      </div>

      {/* Embedded Map */}
      {showEmbedded && (
        <div className="rounded-lg overflow-hidden shadow-md">
          <iframe
            width="100%"
            height="400"
            src={embedUrl}
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  )
}

export default ShopMap
