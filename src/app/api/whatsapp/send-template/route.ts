import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

export async function POST(request: NextRequest) {
  try {
    const { to, templateName, parameters = [], languageCode = 'es_AR' } = await request.json()

    if (!to || !templateName) {
      return NextResponse.json({ error: 'Phone number and template name are required' }, { status: 400 })
    }

    // Initialize WhatsApp API
    const whatsapp = new WhatsAppBusinessApiService()

    // Send template with parameters
    const result = await whatsapp.sendTemplateWithParameters(to, templateName, parameters, languageCode)

    return NextResponse.json({ 
      success: true, 
      message: 'Template sent successfully',
      result 
    })

  } catch (error: any) {
    console.error('Error sending WhatsApp template:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to send template' 
    }, { status: 500 })
  }
}
