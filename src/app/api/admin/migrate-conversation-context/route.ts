import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Run conversation context table migration
export async function POST(request: NextRequest) {
  try {
    console.log('Running conversation context migration...')

    // Check if table exists and works
    const { data: testData, error: testError } = await supabase
      .from('conversation_context')
      .select('*')
      .limit(1)

    if (testError) {
      console.log('Table does not exist yet, that is expected.')
      return NextResponse.json({
        success: true,
        message: 'Table needs to be created manually in Supabase SQL editor',
        sqlFile: 'Use the SQL from supabase_conversation_context.sql'
      })
    }

    console.log('Conversation context table is ready!')

    return NextResponse.json({
      success: true,
      message: 'Conversation context table exists and is working',
      tableExists: true
    })

  } catch (error: any) {
    console.error('Migration check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration check failed',
      details: error.message
    }, { status: 500 })
  }
}