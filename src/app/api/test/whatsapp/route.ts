import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, templateName, parameters = [], test = false } = body

    if (!to) {
      return NextResponse.json({ error: 'Número de teléfono requerido' }, { status: 400 })
    }

    console.log(`🧪 Probando plantilla ${templateName || 'hello_world'} a ${to}`)

    const whatsapp = new WhatsAppBusinessApiService()

    // Verificar configuración
    if (!whatsapp.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp Business API no configurado. Revisa las variables de entorno.',
        details: 'WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID son requeridos'
      }, { status: 500 })
    }

    let result
    
    if (templateName && parameters.length > 0) {
      // Enviar plantilla con parámetros
      result = await whatsapp.sendTemplateWithParameters(to, templateName, parameters, 'es')
    } else if (templateName) {
      // Enviar plantilla simple
      result = await whatsapp.sendTemplate(to, templateName, 'es')
    } else {
      // Enviar hello_world por defecto
      result = await whatsapp.sendTemplate(to, 'hello_world', 'en_US')
    }

    console.log('✅ Plantilla enviada exitosamente:', result)

    return NextResponse.json({
      success: true,
      message: 'Plantilla enviada exitosamente',
      whatsappResponse: result,
      sent: {
        to,
        template: templateName || 'hello_world',
        parameters,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Error enviando plantilla:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error enviando plantilla',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to')
  const template = searchParams.get('template') || 'hello_world'

  if (!to) {
    return NextResponse.json({ 
      error: 'Parámetro "to" requerido. Ejemplo: /api/test/whatsapp?to=54911xxxxxxx&template=hello_world' 
    }, { status: 400 })
  }

  try {
    const whatsapp = new WhatsAppBusinessApiService()

    if (!whatsapp.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp Business API no configurado',
        details: 'Configura WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env.local'
      }, { status: 500 })
    }

    const result = await whatsapp.sendTemplate(to, template, 'es')

    return NextResponse.json({
      success: true,
      message: `Plantilla ${template} enviada a ${to}`,
      result
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
