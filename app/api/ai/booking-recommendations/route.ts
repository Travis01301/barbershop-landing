import { NextRequest, NextResponse } from 'next/server';
import { noShowAnalyticsService } from '@/lib/no-show-analytics-service';

/**
 * GET /api/ai/booking-recommendations?shopId=UUID
 *
 * Get optimal booking times based on historical no-show and cancellation patterns.
 *
 * Query parameters:
 * - shopId: Shop UUID (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "recommendations": [
 *     {
 *       "dayOfWeek": 0-6,
 *       "dayName": "string",
 *       "hour": 0-23,
 *       "timeSlot": "HH:MM AM/PM - HH:MM AM/PM",
 *       "noShowRateAtTime": number (0-100),
 *       "isBusiest": boolean,
 *       "completionRate": number (0-100),
 *       "recommendation": "optimal" | "good" | "busy" | "avoid"
 *     }
 *   ],
 *   "summary": {
 *     "bestTimeSlots": [...],
 *     "timeToAvoid": [...],
 *     "busiestTimes": [...]
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

    // Get booking recommendations
    const recommendations = await noShowAnalyticsService.getBookingRecommendations(shopId);

    // Summarize recommendations
    const bestTimeSlots = recommendations
      .filter((r) => r.recommendation === 'optimal')
      .slice(0, 5);

    const timesToAvoid = recommendations
      .filter((r) => r.recommendation === 'avoid')
      .slice(0, 5);

    const busiestTimes = recommendations
      .filter((r) => r.isBusiest)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      recommendations,
      summary: {
        bestTimeSlots,
        timesToAvoid,
        busiestTimes,
        totalTimeSlots: recommendations.length,
      },
    });
  } catch (error) {
    console.error('Error getting booking recommendations:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to get booking recommendations',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
