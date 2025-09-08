import { NextRequest, NextResponse } from 'next/server'
import { BotService } from '@/services/botService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message, customerName } = body
    
    if (!phone || !message) {
      return NextResponse.json({
        error: "Phone and message are required"
      }, { status: 400 })
    }

    console.log(`🤖 Bot received: "${message}" from ${phone}`)

    // Usar el BotService completo con memoria y contexto
    const botService = new BotService()
    const businessId = 'f2a24619-5016-490c-9dc9-dd08fd6549b3' // Business ID por defecto para testing
    
    // Simular nombre de perfil de WhatsApp o usar el nombre proporcionado
    const profileName = customerName || 'TestUser' // Simular un nombre de perfil real
    
    // Procesar mensaje con el bot completo
    const response = await botService.processMessage(
      message,
      phone,
      businessId,
      profileName
    )

    return NextResponse.json({
      success: true,
      phone,
      message,
      response,
      businessId,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("Bot error:", error)
    return NextResponse.json({
      error: "Server error",
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "Bot endpoint working - FULL VERSION with memory",
    usage: "POST with phone and message",
    example: "Use curl to test the bot with full context and memory",
    features: [
      "✅ 15 minutos de memoria por conversación",
      "✅ Sistema completo de reservas con seña",
      "✅ Detección de comprobantes",
      "✅ Contexto de conversación",
      "✅ Respuestas inteligentes con IA"
    ]
  })
}