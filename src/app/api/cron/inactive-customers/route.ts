import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

// Cron job endpoint for inactive customers automations
// Should be called weekly on Mondays at 10:00 AM
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] 💤 Ejecutando automatizaciones de clientes inactivos...')
    
    const startTime = Date.now()
    const automationService = new AutomationService()
    
    // Run inactive customers automations only
    await automationService.processInactiveCustomersAutomations()

    const duration = Date.now() - startTime
    console.log(`[CRON] ✅ Automatizaciones de clientes inactivos completadas en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Automatizaciones de clientes inactivos ejecutadas exitosamente',
      type: 'inactive_customers',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] ❌ Error ejecutando automatizaciones de clientes inactivos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando automatizaciones de clientes inactivos',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}