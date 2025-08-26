import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

// Cron job endpoint for birthday automations only
// Should be called daily at 9:00 AM
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] 🎂 Ejecutando automatizaciones de cumpleaños...')
    
    const startTime = Date.now()
    const automationService = new AutomationService()
    
    // Run birthday automations only
    await automationService.processBirthdayAutomations()

    const duration = Date.now() - startTime
    console.log(`[CRON] ✅ Automatizaciones de cumpleaños completadas en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Automatizaciones de cumpleaños ejecutadas exitosamente',
      type: 'birthday',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] ❌ Error ejecutando automatizaciones de cumpleaños:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando automatizaciones de cumpleaños',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}