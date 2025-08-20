import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Cleanup expired conversation contexts
export async function POST(request: NextRequest) {
  try {
    console.log('Running conversation context cleanup...')
    
    // Delete expired contexts
    const { data, error, count } = await supabase
      .from('conversation_context')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({
        success: false,
        error: 'Cleanup failed',
        details: error.message
      }, { status: 500 })
    }

    console.log(`Cleaned up ${count || 0} expired conversation contexts`)

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount: count || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error.message
    }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}