import { NextRequest, NextResponse } from 'next/server';
import { processPendingEmails } from '@/lib/email-service';

/**
 * Email processor endpoint
 * Should be called periodically (e.g., every 5 minutes) via cron job or scheduler
 * 
 * Authorization: Requires CRON_SECRET or internal call
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      // Allow internal calls from the same origin
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');

      if (origin !== `https://${host}` && origin !== `http://${host}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('Starting email processing job...');

    // Process pending emails
    await processPendingEmails();

    console.log('Email processing job completed');

    return NextResponse.json(
      { success: true, message: 'Email processing completed' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in email processor:', error);
    return NextResponse.json(
      { error: 'Failed to process emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'support-email-processor',
    timestamp: new Date().toISOString()
  });
}
