import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AutomationService } from '@/services/automationService'
import { AutomationEventSystem } from '@/services/automationEventSystem'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const automationService = new AutomationService()
const eventSystem = new AutomationEventSystem()

// Process all automations (Legacy + Event-Driven)
export async function GET(request: NextRequest) {
  try {
    console.log('🤖 API: Starting automation processing...')
    
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    const testPhone = searchParams.get('test_phone')
    const testType = searchParams.get('test_type')
    const mode = searchParams.get('mode') // 'legacy' | 'event-driven'
    
    if (testPhone && testType) {
      // Test specific automation
      console.log(`🧪 Testing automation: ${testType} for phone: ${testPhone}`)
      
      if (testType === 'birthday') {
        await automationService.testBirthdayAutomation(testPhone)
        return NextResponse.json({ status: 'test_completed', test_type: testType, phone: testPhone })
      }
      
      return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }
    
    // 🚀 EVENT-DRIVEN MODE (Recomendado)
    if (mode === 'event-driven' || mode === 'events') {
      console.log('🚀 Using EVENT-DRIVEN automation system')
      
      if (businessId) {
        // Procesar eventos específicos para business
        await Promise.all([
          eventSystem.checkBirthdaysDaily(),
          eventSystem.checkInactiveCustomers(businessId)
        ])
        
        return NextResponse.json({ 
          status: 'success',
          mode: 'event-driven',
          business_id: businessId,
          message: 'Event-driven automations processed',
          timestamp: new Date().toISOString()
        })
      } else {
        // Procesar todos los eventos
        await Promise.all([
          eventSystem.checkBirthdaysDaily(),
          eventSystem.checkInactiveCustomers()
        ])
        
        return NextResponse.json({ 
          status: 'success',
          mode: 'event-driven',
          message: 'All event-driven automations processed',
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // 📜 LEGACY MODE (Para compatibilidad)
    console.log('📜 Using LEGACY automation system')
    
    if (businessId) {
      // Process automations for specific business (legacy)
      console.log(`🏢 Processing automations for business: ${businessId}`)
      await automationService.processBusinessAutomations(businessId)
      return NextResponse.json({ 
        status: 'success', 
        mode: 'legacy',
        business_id: businessId,
        message: 'Legacy automations processed'
      })
    }
    
    // Process all automations (legacy)
    await automationService.processAllAutomations()
    
    return NextResponse.json({ 
      status: 'success',
      mode: 'legacy', 
      message: 'All legacy automations processed',
      note: 'Consider using ?mode=event-driven for better performance',
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Error processing automations:', error)
    return NextResponse.json({ 
      error: 'Failed to process automations',
      message: error.message 
    }, { status: 500 })
  }
}

// Create new automation
export async function POST(request: NextRequest) {
  try {
    const automationData = await request.json()

    // Validate required fields
    if (!automationData.business_id || !automationData.name || !automationData.automation_type || !automationData.message_template) {
      return NextResponse.json({ 
        error: 'Missing required fields: business_id, name, automation_type, message_template' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('automations')
      .insert([automationData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating automation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}