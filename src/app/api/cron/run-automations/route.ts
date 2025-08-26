import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

// Cron job endpoint for running all automations
// Should be called every hour by external cron service
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] 🤖 Ejecutando todas las automatizaciones...')
    
    const startTime = Date.now()
    const automationService = new AutomationService()
    
    // Run all automations
    await automationService.processAllAutomations()

    const duration = Date.now() - startTime
    console.log(`[CRON] ✅ Automatizaciones completadas en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Automatizaciones ejecutadas exitosamente',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] ❌ Error ejecutando automatizaciones:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando automatizaciones',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}