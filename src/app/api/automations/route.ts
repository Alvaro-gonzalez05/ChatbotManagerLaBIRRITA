import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create new automation
export async function POST(request: NextRequest) {
  try {
    const automationData = await request.json()

    // Validate required fields
    if (!automationData.business_id || !automationData.name || !automationData.automation_type || !automationData.message_template) {
      return NextResponse.json({ 
        error: 'Missing required fields: business_id, name, automation_type, message_template' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('automations')
      .insert([automationData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating automation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}