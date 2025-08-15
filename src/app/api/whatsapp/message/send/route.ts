import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'
import { BotService } from '@/services/botService'

const whatsappBusinessApi = new WhatsAppBusinessApiService()
const botService = new BotService()

export async function POST(request: NextRequest) {
  try {
    const { instanceName, number, message } = await request.json()
    
    if (!instanceName || !number || !message) {
      return NextResponse.json(
        { error: 'instanceName, number, and message are required' },
        { status: 400 }
      )
    }

    // Try WhatsApp Business API first
    if (whatsappBusinessApi.isConfigured()) {
      try {
        const result = await whatsappBusinessApi.sendMessage(number, message)
        return NextResponse.json({ 
          message: 'Message sent successfully via WhatsApp Business API',
          messageId: result.messages?.[0]?.id,
          whatsappId: result.contacts?.[0]?.wa_id
        })
      } catch (whatsappError: any) {
        console.error('WhatsApp Business API failed, trying Evolution API...', whatsappError.message)
      }
    }

    // Fallback to bot service (Evolution API)
    const success = await botService.sendMessage(instanceName, number, message)
    
    if (success) {
      return NextResponse.json({ message: 'Message sent successfully via Evolution API' })
    } else {
      return NextResponse.json(
        { error: 'Failed to send message via both APIs' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}