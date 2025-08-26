import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/services/automationService'

// Cron job endpoint for points notification automations
// Should be called every hour to catch recent point loads
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] ⭐ Ejecutando automatizaciones de notificación de puntos...')
    
    const startTime = Date.now()
    const automationService = new AutomationService()
    
    // Run points notification automations only
    await automationService.processPointsNotificationAutomations()

    const duration = Date.now() - startTime
    console.log(`[CRON] ✅ Automatizaciones de puntos completadas en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Automatizaciones de notificación de puntos ejecutadas exitosamente',
      type: 'points_notification',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] ❌ Error ejecutando automatizaciones de puntos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando automatizaciones de puntos',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}