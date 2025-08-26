import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testPhone = "2616977056", templateName = "hello_world" } = body

    console.log(`🧪 Probando plantilla ${templateName} a número ${testPhone}`)

    const whatsapp = new WhatsAppBusinessApiService()

    // Verificar configuración
    if (!whatsapp.isConfigured()) {
      return NextResponse.json({ 
        error: 'WhatsApp Business API no configurado',
        details: 'Verifica WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env.local',
        configured: false
      }, { status: 500 })
    }

    let result
    let parameters: string[] = []

    // Definir parámetros según la plantilla
    switch (templateName) {
      case 'hello_world':
        result = await whatsapp.sendTemplate(testPhone, 'hello_world', 'en_US')
        break

      case 'birthday_reminder':
        // Header: {{1}} = nombre del cliente
        // Body: {{1}} = promocion especial, {{2}} = puntos de regalo
        parameters = [
          "Álvaro", // {{1}} Header: nombre del cliente
          "🎂 Celebración especial de cumpleaños", // {{1}} Body: promocion especial
          "100" // {{2}} Body: puntos de regalo
        ]
        result = await whatsapp.sendTemplateWithParameters(testPhone, templateName, parameters)
        break

      case 'points_notification':
        // Body: {{1}} = nombre del cliente, {{2}} = puntos que acaba de sumar, {{3}} = recompensas disponibles
        parameters = [
          "Álvaro", // {{1}} nombre del cliente
          "75", // {{2}} puntos que acaba de sumar
          "Cerveza premium gratis" // {{3}} recompensas disponibles
        ]
        result = await whatsapp.sendTemplateWithParameters(testPhone, templateName, parameters)
        break

      case 'inactive_customer_vip':
        // Header: {{1}} = nombre del cliente
        // Body: {{1}} = promocion especial
        parameters = [
          "Álvaro", // {{1}} Header: nombre del cliente
          "🍺 Descuento VIP exclusivo del 30%" // {{1}} Body: promocion especial
        ]
        result = await whatsapp.sendTemplateWithParameters(testPhone, templateName, parameters)
        break

      case 'inactive_customer_new':
        // Mantengo la misma estructura que VIP por ahora
        parameters = [
          "Álvaro", // {{1}} Header: nombre del cliente
          "🎯 Oferta especial para nuevos clientes" // {{1}} Body: promocion especial
        ]
        result = await whatsapp.sendTemplateWithParameters(testPhone, templateName, parameters)
        break

      case 'missing_data_request':
        // Body: {{1}} = nombre del cliente, {{2}} = campo faltante, {{3}} = puntos de recompensa
        parameters = [
          "Álvaro", // {{1}} nombre del cliente
          "fecha de cumpleaños", // {{2}} campo faltante
          "50" // {{3}} puntos de recompensa
        ]
        result = await whatsapp.sendTemplateWithParameters(testPhone, templateName, parameters)
        break

      default:
        return NextResponse.json({ 
          error: `Plantilla '${templateName}' no reconocida`,
          availableTemplates: [
            'hello_world',
            'birthday_reminder', 
            'points_notification',
            'inactive_customer_vip',
            'inactive_customer_new',
            'missing_data_request'
          ]
        }, { status: 400 })
    }

    if (result && !result.error) {
      console.log(`✅ Plantilla ${templateName} enviada exitosamente a ${testPhone}`)
      
      return NextResponse.json({
        success: true,
        message: `Plantilla ${templateName} enviada exitosamente`,
        phone: testPhone,
        template: templateName,
        parameters,
        whatsappResponse: result,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log(`❌ Error enviando plantilla ${templateName}:`, result)
      
      return NextResponse.json({
        success: false,
        error: `Error enviando plantilla ${templateName}`,
        phone: testPhone,
        template: templateName,
        parameters,
        details: result,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ Error en endpoint de prueba:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const template = searchParams.get('template') || 'hello_world'
  const phone = searchParams.get('phone') || '2616977056'

  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ testPhone: phone, templateName: template })
  }))
}
