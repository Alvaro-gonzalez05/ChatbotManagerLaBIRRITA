import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/services/aiService'

const aiService = new AIService()

// Test endpoint to simulate bot conversations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, message, businessId = '1' } = body

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    console.log(`Test bot - Processing message from ${phoneNumber}: ${message}`)

    // Process message using AI service
    const result = await aiService.processMessage(phoneNumber, message, businessId)
    
    return NextResponse.json({
      success: true,
      phoneNumber,
      userMessage: message,
      botResponse: result.response,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Test bot error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Immediate response test (no delay)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phoneNumber = searchParams.get('phone') || '1234567890'
    const message = searchParams.get('message') || 'Hola'
    const businessId = searchParams.get('business') || '1'

    console.log(`Test bot (immediate) - Processing message from ${phoneNumber}: ${message}`)

    // Process message immediately without delay
    const response = await aiService.processImmediateMessage(phoneNumber, message, businessId)
    
    return NextResponse.json({
      success: true,
      phoneNumber,
      userMessage: message,
      botResponse: response,
      timestamp: new Date().toISOString(),
      mode: 'immediate'
    })

  } catch (error: any) {
    console.error('Test bot immediate error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}