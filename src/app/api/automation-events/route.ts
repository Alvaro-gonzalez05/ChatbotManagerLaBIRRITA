import { NextRequest, NextResponse } from 'next/server'
import { AutomationEventSystem } from '@/services/automationEventSystem'

const eventSystem = new AutomationEventSystem()

// 🚀 EVENT-DRIVEN Automation Endpoints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('event')
    const businessId = searchParams.get('business_id')
    
    console.log(`🚀 EVENT API: ${eventType} para business: ${businessId || 'todos'}`)
    
    switch (eventType) {
      
      case 'daily':
        // 🌅 Evento diario combinado: cumpleaños + evaluación VIP
        console.log('🌅 Ejecutando automatizaciones diarias...')
        await eventSystem.checkBirthdaysDaily()
        await eventSystem.checkVipEvaluation()
        return NextResponse.json({ 
          status: 'success', 
          event: 'daily', 
          message: 'Automatizaciones diarias completadas (cumpleaños + VIP)',
          timestamp: new Date().toISOString()
        })
      
      case 'birthdays':
        // 🎂 Evento diario optimizado de cumpleaños
        await eventSystem.checkBirthdaysDaily()
        return NextResponse.json({ 
          status: 'success', 
          event: 'birthdays', 
          message: 'Verificación diaria de cumpleaños completada',
          timestamp: new Date().toISOString()
        })
      
      case 'inactive':
        // 💤 Evento de clientes inactivos
        await eventSystem.checkInactiveCustomers(businessId || undefined)
        return NextResponse.json({ 
          status: 'success', 
          event: 'inactive', 
          business_id: businessId || 'all',
          message: 'Verificación de clientes inactivos completada',
          timestamp: new Date().toISOString()
        })
      
      case 'test-customer':
        // 🧪 Simular registro de cliente para testing
        const testCustomer = {
          id: 'test-customer-id',
          business_id: businessId || 'f2a24619-5016-490c-9dc9-dd08fd6549b3',
          name: 'Cliente Test',
          phone: '5491234567890',
          email: undefined,
          instagram_username: undefined,
          birthday: undefined,
          points: 0,
          created_at: new Date().toISOString(),
          last_interaction: new Date().toISOString(),
          visit_count: 1
        }
        
        await eventSystem.onCustomerRegistered(testCustomer)
        return NextResponse.json({
          status: 'success',
          event: 'test-customer',
          message: 'Evento de cliente de prueba ejecutado',
          customer: testCustomer
        })
      
      default:
        return NextResponse.json({
          error: 'Tipo de evento no válido',
          available_events: ['birthdays', 'inactive', 'test-customer'],
          usage: '?event=birthdays&business_id=uuid'
        }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Error procesando evento de automatización:', error)
    return NextResponse.json({ 
      error: 'Error procesando evento',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// 🎯 POST para disparar eventos específicos
export async function POST(request: NextRequest) {
  try {
    const { eventType, customerId, businessId, data } = await request.json()
    
    console.log(`🚀 EVENT POST: ${eventType}`)
    
    switch (eventType) {
      
      case 'customer_registered':
        if (!data || !data.business_id) {
          return NextResponse.json({ error: 'data.business_id requerido' }, { status: 400 })
        }
        await eventSystem.onCustomerRegistered(data)
        return NextResponse.json({ status: 'success', event: eventType, processed: true })
      
      case 'birthday_check':
        await eventSystem.checkBirthdaysDaily()
        return NextResponse.json({ status: 'success', event: eventType, processed: true })
      
      case 'inactive_check':
        await eventSystem.checkInactiveCustomers(businessId)
        return NextResponse.json({ status: 'success', event: eventType, business_id: businessId })
      
      default:
        return NextResponse.json({
          error: 'Tipo de evento no válido',
          available_events: ['customer_registered', 'birthday_check', 'inactive_check']
        }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Error procesando POST de evento:', error)
    return NextResponse.json({ 
      error: 'Error procesando evento POST',
      message: error.message 
    }, { status: 500 })
  }
}