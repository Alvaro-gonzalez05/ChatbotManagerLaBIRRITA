import { NextResponse } from "next/server"
import { BotService } from "@/services/botService"

const botService = new BotService()

export async function POST(request) {
  try {
    const body = await request.json()
    const { phone, message, businessId = "f2a24619-5016-490c-9dc9-dd08fd6549b3" } = body

    if (!phone || !message) {
      return NextResponse.json({ error: "Phone and message required" }, { status: 400 })
    }

    console.log(`🤖 Bot received: ${message} from ${phone}`)

    // Use the same BotService as the webhook and chat simulator
    const response = await botService.processMessage(message, phone, businessId)

    console.log(`🎯 Bot response: ${response}`)

    return NextResponse.json({
      success: true,
      phone,
      message,
      response,
      businessId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Bot error:", error)
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "Bot endpoint working with BotService",
    info: "Uses the same AI bot as webhook and chat simulator"
  })
}
