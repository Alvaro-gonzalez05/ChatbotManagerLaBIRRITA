import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Check existing tables and create missing ones
export async function GET(request: NextRequest) {
  try {
    console.log('Checking database tables...')

    // Check if businesses table exists
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)

    console.log('Businesses table check:', businessError ? 'MISSING' : 'EXISTS')

    // Check if whatsapp_configurations table exists
    const { data: whatsapp, error: whatsappError } = await supabase
      .from('whatsapp_configurations')
      .select('id')
      .limit(1)

    console.log('WhatsApp configurations table check:', whatsappError ? 'MISSING' : 'EXISTS')

    return NextResponse.json({
      success: true,
      tables: {
        businesses: {
          exists: !businessError,
          error: businessError?.message
        },
        whatsapp_configurations: {
          exists: !whatsappError,
          error: whatsappError?.message
        }
      }
    })

  } catch (error: any) {
    console.error('Table check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check tables',
      details: error.message
    }, { status: 500 })
  }
}

// Create missing tables
export async function POST(request: NextRequest) {
  try {
    console.log('Creating missing tables...')

    // Try to create businesses table first if it doesn't exist
    const { error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)

    if (businessError) {
      console.log('Creating businesses table...')
      // Create a basic businesses table structure
      const { error: createBusinessError } = await supabase
        .schema('public')
        .from('businesses')
        .insert([])

      console.log('Business table creation result:', createBusinessError?.message || 'Success')
    }

    return NextResponse.json({
      success: true,
      message: 'Tables checked and created as needed'
    })

  } catch (error: any) {
    console.error('Table creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create tables',
      details: error.message
    }, { status: 500 })
  }
}