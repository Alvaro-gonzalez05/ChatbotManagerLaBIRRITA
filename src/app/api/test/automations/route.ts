import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, customerPhone, testMode = true } = body

    if (!type) {
      return NextResponse.json({ 
        error: 'Tipo de automatización requerido',
        types: ['birthday', 'points', 'inactive', 'missing_fields', 'all']
      }, { status: 400 })
    }

    console.log(`🧪 Probando automatización: ${type}`)

    const automationService = new AutomationService()
    let result

    switch (type) {
      case 'birthday':
        if (customerPhone) {
          await automationService.testBirthdayAutomation(customerPhone)
          result = { message: `Prueba de cumpleaños enviada a ${customerPhone}` }
        } else {
          await automationService.processBirthdayAutomations()
          result = { message: 'Automatizaciones de cumpleaños procesadas' }
        }
        break

      case 'points':
        await automationService.processPointsNotificationAutomations()
        result = { message: 'Automatizaciones de puntos procesadas' }
        break

      case 'inactive':
        await automationService.processInactiveCustomersAutomations()
        result = { message: 'Automatizaciones de clientes inactivos procesadas' }
        break

      case 'missing_fields':
        await automationService.processMissingFieldsAutomations()
        result = { message: 'Automatizaciones de campos faltantes procesadas' }
        break

      case 'all':
        await automationService.processAllAutomations()
        result = { message: 'Todas las automatizaciones procesadas' }
        break

      default:
        return NextResponse.json({ error: 'Tipo de automatización no válido' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      type,
      testMode,
      customerPhone,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error en prueba de automatización:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error en prueba de automatización',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const phone = searchParams.get('phone')

  try {
    const automationService = new AutomationService()

    if (type === 'birthday' && phone) {
      await automationService.testBirthdayAutomation(phone)
      return NextResponse.json({
        success: true,
        message: `Prueba de cumpleaños enviada a ${phone}`
      })
    }

    // Ejecutar tipo específico o todas
    switch (type) {
      case 'birthday':
        await automationService.processBirthdayAutomations()
        break
      case 'points':
        await automationService.processPointsNotificationAutomations()
        break
      case 'inactive':
        await automationService.processInactiveCustomersAutomations()
        break
      case 'missing_fields':
        await automationService.processMissingFieldsAutomations()
        break
      default:
        await automationService.processAllAutomations()
    }

    return NextResponse.json({
      success: true,
      message: `Automatización ${type} ejecutada exitosamente`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
