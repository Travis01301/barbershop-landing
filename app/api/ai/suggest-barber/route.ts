import { NextRequest, NextResponse } from 'next/server';
import { noShowAnalyticsService } from '@/lib/no-show-analytics-service';

/**
 * POST /api/ai/suggest-barber
 *
 * Suggest the best barber for a new appointment based on:
 * - Barber's no-show rate
 * - Customer's history with the barber
 * - Barber's current availability
 *
 * Request body:
 * {
 *   "shopId": "string (UUID)",
 *   "customerId": "string (UUID)",
 *   "appointmentDate": "ISO 8601 datetime"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "suggestion": {
 *     "barberId": "string",
 *     "barberName": "string",
 *     "recommendationScore": 0-100,
 *     "noShowRate": number,
 *     "customerHistoryWithBarber": {
 *       "previousAppointments": number,
 *       "noShowCount": number
 *     },
 *     "availabilityPercentage": 0-100,
 *     "reasoning": "string"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, customerId, appointmentDate } = body;

    // Validate required fields
    if (!shopId || !customerId || !appointmentDate) {
      return NextResponse.json(
        {
          error: 'Missing required fields: shopId, customerId, appointmentDate',
        },
        { status: 400 }
      );
    }

    // Suggest barber
    const suggestion = await noShowAnalyticsService.suggestBarber(
      shopId,
      customerId,
      new Date(appointmentDate)
    );

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    console.error('Error suggesting barber:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to suggest barber',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
