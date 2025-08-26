import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

// Cron job endpoint for missing fields automations
// Should be called daily at 11:00 AM to check for incomplete profiles
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] 📝 Ejecutando automatizaciones de campos faltantes...')
    
    const startTime = Date.now()
    const automationService = new AutomationService()
    
    // Run missing fields automations only
    await automationService.processMissingFieldsAutomations()

    const duration = Date.now() - startTime
    console.log(`[CRON] ✅ Automatizaciones de campos faltantes completadas en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Automatizaciones de campos faltantes ejecutadas exitosamente',
      type: 'missing_field',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] ❌ Error ejecutando automatizaciones de campos faltantes:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando automatizaciones de campos faltantes',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}