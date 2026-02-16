import { NextRequest } from 'next/server'
import { getClient } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Marketplace Integrations API
 * - GET: List available apps and installed apps
 * - POST: Install/uninstall marketplace apps
 */

export async function GET(request: NextRequest) {
  const routeLogger = logger.createChild('api.integrations.marketplace.GET')

  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const onlyInstalled = searchParams.get('onlyInstalled') === 'true'

    if (!shopId) {
      return Response.json({ error: 'Shop ID required' }, { status: 400 })
    }

    routeLogger.debug('Fetching marketplace apps', { shopId, onlyInstalled })

    const client = await getClient()

    try {
      let query = 'SELECT id, app_name, app_description, app_icon_url, developer_name, rating FROM marketplace_apps WHERE is_published = true'

      if (onlyInstalled) {
        query = `
          SELECT ma.id, ma.app_name, ma.app_description, ma.app_icon_url,
                 ma.developer_name, ma.rating, mi.is_active, mi.installed_at
          FROM marketplace_apps ma
          JOIN marketplace_installations mi ON ma.id = mi.app_id
          WHERE mi.shop_id = $1 AND is_published = true
          ORDER BY mi.installed_at DESC
        `
      } else {
        query += ' ORDER BY installation_count DESC'
      }

      const params: any[] = []
      if (onlyInstalled) {
        params.push(parseInt(shopId))
      }

      const appsRes = await client.query(query, params)

      routeLogger.debug('Marketplace apps retrieved', { count: appsRes.rows.length })

      // For installed apps, check installation status
      if (onlyInstalled) {
        return Response.json({
          success: true,
          apps: appsRes.rows.map((row: any) => ({
            id: row.id,
            name: row.app_name,
            description: row.app_description,
            iconUrl: row.app_icon_url,
            developerName: row.developer_name,
            rating: row.rating,
            isInstalled: true,
            isActive: row.is_active,
            installedAt: row.installed_at,
          })),
        })
      }

      // Get installations for this shop
      const installRes = await client.query(
        'SELECT app_id FROM marketplace_installations WHERE shop_id = $1 AND is_active = true',
        [parseInt(shopId)]
      )

      const installedAppIds = new Set(installRes.rows.map((r: any) => r.app_id))

      return Response.json({
        success: true,
        apps: appsRes.rows.map((row: any) => ({
          id: row.id,
          name: row.app_name,
          description: row.app_description,
          iconUrl: row.app_icon_url,
          developerName: row.developer_name,
          rating: row.rating,
          isInstalled: installedAppIds.has(row.id),
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Marketplace apps fetch error:', error)
    return Response.json(
      { error: 'Failed to fetch marketplace apps', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const routeLogger = logger.createChild('api.integrations.marketplace.POST')

  try {
    const body = await request.json()
    const { shopId, appId, action = 'install' } = body

    if (!shopId || !appId || !['install', 'uninstall'].includes(action)) {
      return Response.json(
        { error: 'Shop ID, app ID, and action are required (install/uninstall)' },
        { status: 400 }
      )
    }

    routeLogger.debug('Managing marketplace app', { shopId, appId, action })

    const client = await getClient()

    try {
      if (action === 'install') {
        // Check if app is already installed
        const existingRes = await client.query(
          'SELECT id FROM marketplace_installations WHERE shop_id = $1 AND app_id = $2',
          [parseInt(shopId), parseInt(appId)]
        )

        if (existingRes.rows.length > 0) {
          // Re-activate if it exists
          await client.query(
            'UPDATE marketplace_installations SET is_active = true, uninstalled_at = NULL WHERE shop_id = $1 AND app_id = $2',
            [parseInt(shopId), parseInt(appId)]
          )
        } else {
          // Create new installation
          await client.query(
            `INSERT INTO marketplace_installations (shop_id, app_id, is_active)
             VALUES ($1, $2, true)`,
            [parseInt(shopId), parseInt(appId)]
          )

          // Increment installation count
          await client.query(
            'UPDATE marketplace_apps SET installation_count = installation_count + 1 WHERE id = $1',
            [parseInt(appId)]
          )
        }

        routeLogger.info('App installed', { shopId, appId })

        return Response.json({
          success: true,
          message: 'App installed successfully',
        }, { status: 201 })
      } else {
        // Uninstall (soft delete)
        const result = await client.query(
          `UPDATE marketplace_installations
           SET is_active = false, uninstalled_at = CURRENT_TIMESTAMP
           WHERE shop_id = $1 AND app_id = $2`,
          [parseInt(shopId), parseInt(appId)]
        )

        if (result.rowCount === 0) {
          return Response.json(
            { error: 'App not installed' },
            { status: 404 }
          )
        }

        // Decrement installation count
        await client.query(
          'UPDATE marketplace_apps SET installation_count = CASE WHEN installation_count > 0 THEN installation_count - 1 ELSE 0 END WHERE id = $1',
          [parseInt(appId)]
        )

        routeLogger.info('App uninstalled', { shopId, appId })

        return Response.json({
          success: true,
          message: 'App uninstalled successfully',
        })
      }
    } finally {
      client.release()
    }
  } catch (error) {
    routeLogger.error('Marketplace action error:', error)
    return Response.json(
      { error: 'Failed to manage marketplace app', details: (error as Error).message },
      { status: 500 }
    )
  }
}
