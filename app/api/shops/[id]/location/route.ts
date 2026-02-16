import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'
import { googleMapsService } from '@/lib/google-maps-service'

const locationLogger = logger.createChild('shop-location')

/**
 * GET /api/shops/[id]/location
 * Get shop location and Google Maps info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    locationLogger.debug('Fetching shop location', { shopId: id })

    const result = await query(
      `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        hours,
        google_maps_place_id
      FROM shops
      WHERE id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const shop = result.rows[0]

    // Generate Google Maps URLs
    const mapsLink = googleMapsService.getMapsLink(shop.latitude, shop.longitude)
    const directionsUrl = googleMapsService.getDirectionsUrl(shop.latitude, shop.longitude)

    locationLogger.info('Shop location retrieved', { shopId: id })

    return NextResponse.json({
      id: shop.id,
      name: shop.name,
      address: shop.address,
      latitude: parseFloat(shop.latitude),
      longitude: parseFloat(shop.longitude),
      phone: shop.phone,
      hours: shop.hours,
      google_maps_place_id: shop.google_maps_place_id,
      links: {
        maps: mapsLink,
        directions: directionsUrl,
      },
    })
  } catch (error) {
    locationLogger.error('Error fetching shop location', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop location' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/shops/[id]/location
 * Update shop location (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { latitude, longitude, address } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude required' },
        { status: 400 }
      )
    }

    locationLogger.debug('Updating shop location', { shopId: id })

    const result = await query(
      `
      UPDATE shops
      SET 
        latitude = $1,
        longitude = $2,
        address = COALESCE($3, address)
      WHERE id = $4
      RETURNING id, latitude, longitude, address
      `,
      [latitude, longitude, address || null, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    locationLogger.info('Shop location updated', { shopId: id })

    return NextResponse.json({
      success: true,
      location: result.rows[0],
    })
  } catch (error) {
    locationLogger.error('Error updating shop location', error)
    return NextResponse.json(
      { error: 'Failed to update shop location' },
      { status: 500 }
    )
  }
}
