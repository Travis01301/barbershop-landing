import { NextRequest, NextResponse } from 'next/server';
import { noShowAnalyticsService } from '@/lib/no-show-analytics-service';

/**
 * POST /api/ai/predict-no-show
 *
 * Predict the no-show risk for an appointment.
 *
 * Request body:
 * {
 *   "shopId": "string (UUID)",
 *   "appointmentId": "string (UUID)",
 *   "customerId": "string (UUID)",
 *   "barberId": "string (UUID)",
 *   "startTime": "ISO 8601 datetime"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "prediction": {
 *     "appointmentId": "string",
 *     "riskScore": 0-100,
 *     "riskLevel": "low" | "medium" | "high",
 *     "factors": {...},
 *     "shouldAlert": boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, appointmentId, customerId, barberId, startTime } = body;

    // Validate required fields
    if (!shopId || !appointmentId || !customerId || !barberId || !startTime) {
      return NextResponse.json(
        {
          error: 'Missing required fields: shopId, appointmentId, customerId, barberId, startTime',
        },
        { status: 400 }
      );
    }

    // Predict no-show risk
    const prediction = await noShowAnalyticsService.predictNoShowRisk(
      {
        appointmentId,
        customerId,
        barberId,
        startTime: new Date(startTime),
      },
      shopId
    );

    // Save prediction to database
    await noShowAnalyticsService.savePrediction(prediction, shopId, customerId, barberId);

    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error('Error predicting no-show:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to predict no-show risk',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
