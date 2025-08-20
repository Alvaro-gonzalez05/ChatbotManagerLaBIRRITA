import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Run WhatsApp configurations table migration
export async function POST(request: NextRequest) {
  try {
    console.log('Running WhatsApp configurations migration...')

    // Create whatsapp_configurations table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create whatsapp_configurations table
        CREATE TABLE IF NOT EXISTS whatsapp_configurations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            phone_number_id VARCHAR(50) NOT NULL,
            phone_number VARCHAR(20),
            verified_name VARCHAR(255),
            status VARCHAR(20) DEFAULT 'connected',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(business_id),
            UNIQUE(phone_number_id)
        );
      `
    })

    if (tableError) {
      console.error('Error creating table:', tableError)
      // Try direct SQL execution
      const { error: directError } = await supabase
        .from('whatsapp_configurations')
        .select('id')
        .limit(1)

      if (directError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create whatsapp_configurations table',
          details: tableError.message
        }, { status: 500 })
      }
    }

    // Check if table exists and works
    const { data: testData, error: testError } = await supabase
      .from('whatsapp_configurations')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('Table test failed:', testError)
      return NextResponse.json({
        success: false,
        error: 'Table creation verification failed',
        details: testError.message
      }, { status: 500 })
    }

    console.log('WhatsApp configurations table is ready!')

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configurations table created successfully',
      tableExists: true
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message
    }, { status: 500 })
  }
}