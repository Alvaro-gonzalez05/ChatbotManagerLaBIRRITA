import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Cron job endpoint for cleaning up expired conversation contexts
// Should be called every 20 minutes by external cron service
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (basic security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Running conversation context cleanup...')
    
    const startTime = Date.now()
    
    // Delete expired contexts
    const { error, count } = await supabase
      .from('conversation_context')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('[CRON] Cleanup error:', error)
      return NextResponse.json({
        success: false,
        error: 'Cleanup failed',
        details: error.message
      }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log(`[CRON] Cleaned up ${count || 0} expired conversation contexts in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount: count || 0,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[CRON] Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    }, { status: 500 })
  }
}

// Also allow POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}