import { logger } from './logger'

const mapsLogger = logger.createChild('google-maps')

export interface ShopLocation {
  shopId: string
  address: string
  latitude: number
  longitude: number
  phoneNumber?: string
  hours?: string
}

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
}

/**
 * Google Maps integration service
 * Handles geocoding, distance calculations, and map display
 */
class GoogleMapsService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || ''
  }

  /**
   * Geocode an address to get latitude/longitude
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      mapsLogger.warn('Google Maps API key not configured')
      return null
    }

    try {
      const encoded = encodeURIComponent(address)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${this.apiKey}`
      )

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.results.length === 0) {
        mapsLogger.warn('No results for address', { address })
        return null
      }

      const result = data.results[0]
      const { lat, lng } = result.geometry.location

      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formatted_address,
      }
    } catch (error) {
      mapsLogger.error('Geocoding error', error, { address })
      return null
    }
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Get Google Maps embed URL for a location
   */
  getEmbedUrl(latitude: number, longitude: number, zoom: number = 15): string {
    return `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${latitude},${longitude}&zoom=${zoom}`
  }

  /**
   * Get Google Maps directions URL
   */
  getDirectionsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  }

  /**
   * Get Google Maps link (external)
   */
  getMapsLink(latitude: number, longitude: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }
}

export const googleMapsService = new GoogleMapsService()
export default googleMapsService
