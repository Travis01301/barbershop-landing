import { NextRequest, NextResponse } from 'next/server';
import { noShowAnalyticsService } from '@/lib/no-show-analytics-service';

/**
 * GET /api/ai/barber-stats?shopId=UUID
 *
 * Get aggregated no-show and performance statistics for all barbers in a shop.
 *
 * Query parameters:
 * - shopId: Shop UUID (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "stats": [
 *     {
 *       "barberId": "string",
 *       "barberName": "string",
 *       "totalAppointments": number,
 *       "noShowCount": number,
 *       "noShowRate": number (0-100),
 *       "cancellationRate": number (0-100),
 *       "completionRate": number (0-100),
 *       "peakNoShowHour": number,
 *       "peakNoShowDay": number
 *     }
 *   ],
 *   "summary": {
 *     "shopAverageNoShowRate": number,
 *     "bestPerformingBarber": {...},
 *     "needsAttentionBarber": {...}
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: shopId',
        },
        { status: 400 }
      );
    }

    // Get barber statistics
    const stats = await noShowAnalyticsService.getBarberStats(shopId);

    if (stats.length === 0) {
      return NextResponse.json({
        success: true,
        stats: [],
        summary: {
          shopAverageNoShowRate: 0,
          bestPerformingBarber: null,
          needsAttentionBarber: null,
        },
      });
    }

    // Calculate summary statistics
    const totalNoShows = stats.reduce((sum, s) => sum + s.noShowCount, 0);
    const totalAppointments = stats.reduce((sum, s) => sum + s.totalAppointments, 0);
    const shopAverageNoShowRate =
      totalAppointments > 0 ? (totalNoShows / totalAppointments) * 100 : 0;

    // Find best and worst performers
    const bestPerformingBarber = stats.length > 0
      ? stats.reduce((best, current) =>
          current.noShowRate < best.noShowRate ? current : best
        )
      : null;

    const needsAttentionBarber = stats.length > 0
      ? stats.reduce((worst, current) =>
          current.noShowRate > worst.noShowRate ? current : worst
        )
      : null;

    return NextResponse.json({
      success: true,
      stats,
      summary: {
        shopAverageNoShowRate: parseFloat(shopAverageNoShowRate.toFixed(2)),
        bestPerformingBarber,
        needsAttentionBarber,
        totalBarbers: stats.length,
        totalAppointmentsTracked: totalAppointments,
      },
    });
  } catch (error) {
    console.error('Error getting barber statistics:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to get barber statistics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
