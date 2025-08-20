import { NextRequest, NextResponse } from 'next/server'
import { BotService } from '@/services/botService'

const botService = new BotService()

// Test endpoint for chat simulator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, message, businessId } = body

    if (!phoneNumber || !message || !businessId) {
      return NextResponse.json(
        { error: 'Phone number, message, and business ID are required' },
        { status: 400 }
      )
    }

    console.log(`Processing test message from ${phoneNumber}: "${message}"`)

    // Process message with bot service (let it find customer name from DB)
    const botResponse = await botService.processMessage(
      message,
      phoneNumber,
      businessId,
      undefined // Let the bot find the customer name from database
    )

    console.log(`Bot response: "${botResponse}"`)

    return NextResponse.json({
      success: true,
      botResponse
    })

  } catch (error: any) {
    console.error('Error in test AI endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}