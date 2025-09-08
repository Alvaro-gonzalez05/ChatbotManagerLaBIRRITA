import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/services/whatsappService'

const whatsapp = new WhatsAppService()

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, testMessage } = await request.json()
    
    console.log(`🧪 Testing WhatsApp message to: ${phoneNumber}`)
    
    // Probar envío de mensaje simple (no template)
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
    const result = await whatsapp.sendTextMessage(phoneNumberId, phoneNumber, testMessage || "Prueba de mensaje desde La Birrita 🍺")
    
    console.log('📱 WhatsApp result:', result)
    
    return NextResponse.json({
      success: !result.error,
      result: result,
      phoneNumber: phoneNumber,
      message: testMessage || "Prueba de mensaje desde La Birrita 🍺"
    })
    
  } catch (error: any) {
    console.error('❌ Error testing WhatsApp:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const phoneNumber = "5492616977056"
  
  try {
    // Probar diferentes formatos
    const formats = [
      "5492616977056",
      "+5492616977056", 
      "542616977056",
      "+542616977056"
    ]
    
    const results = []
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
    
    for (const format of formats) {
      console.log(`🧪 Testing format: ${format}`)
      
      const result = await whatsapp.sendTextMessage(phoneNumberId, format, `Prueba formato: ${format}`)
      
      results.push({
        format: format,
        success: !result.error,
        error: result.error?.message || null
      })
    }
    
    return NextResponse.json({
      success: true,
      results: results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
