import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { aiProvider } from '@/lib/ai-provider'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const aiLogger = logger.createChild('ai-generate-description')

const GenerateDescriptionSchema = z.object({
  type: z.enum(['service', 'styling-note', 'review'], {
    errorMap: () => ({ message: 'type must be service, styling-note, or review' }),
  }),
  context: z.string().min(10, 'Context must be at least 10 characters'),
})

/**
 * DEPRECATED: This endpoint is no longer used
 * AI features have been moved to the Jarvis bot (Ollama)
 * The app now focuses on core booking/payment/CRM functionality
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'AI features are now handled by Jarvis bot. Use /api/ai/chat instead.' },
    { status: 410 } // 410 Gone
  )
  try {
    const body = await request.json()

    // Validate input
    const validation = validateInput(GenerateDescriptionSchema, body, 'generate-description')
    if (!validation.success) {
      aiLogger.warn('Validation failed', { errors: validation.errors })
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { type, context } = validation.data!

    aiLogger.info('Generate description request', { type, contextLength: context.length })

    // Build prompt based on type
    let prompt = ''
    if (type === 'service') {
      prompt = `Generate a professional, concise description for a barbershop service: "${context}". 
        Include benefits and what to expect. Keep it to 2-3 sentences.`
    } else if (type === 'styling-note') {
      prompt = `Generate a short styling note for customer hair preferences: "${context}". 
        Be specific and actionable for the barber. Keep it to 1-2 sentences.`
    } else {
      prompt = `Generate a helpful review response to this feedback: "${context}". 
        Be professional and appreciative. Keep it brief (1-2 sentences).`
    }

    // Get AI response from local Phi4 model (fast, customer-facing)
    const response = await aiProvider.sendMessage(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      'app'
    )

    aiLogger.info('AI description generated successfully', {
      type,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
    })

    return NextResponse.json({
      success: true,
      description: response.text,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
    })
  } catch (error) {
    aiLogger.error('Error generating description', error)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/status
 * Check Ollama server status
 */
export async function GET() {
  const status = await aiProvider.getStatus()
  return NextResponse.json(status)
}
