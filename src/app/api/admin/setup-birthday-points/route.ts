import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🎂 Creating birthday points automation...')

    // Configuración de la automatización para puntos de cumpleaños
    const birthdayPointsAutomation = {
      business_id: 'f2a24619-5016-490c-9dc9-dd08fd6549b3', // Tu business ID
      name: 'Puntos de Cumpleaños',
      automation_type: 'birthday',
      trigger_days: 0, // DÍA EXACTO del cumpleaños
      is_active: true,
      message_template: '¡Feliz cumpleaños! Se han agregado puntos especiales a tu cuenta.', // Template mínimo requerido
      promotion_id: null, // Sin promoción específica
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Verificar si ya existe
    const { data: existing, error: checkError } = await supabase
      .from('automations')
      .select('id')
      .eq('business_id', birthdayPointsAutomation.business_id)
      .eq('automation_type', 'birthday')
      .eq('trigger_days', 0)

    if (checkError) {
      console.error('Error checking existing automation:', checkError)
      return NextResponse.json({ error: 'Error checking existing automation' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      console.log('✅ Birthday points automation already exists')
      return NextResponse.json({ 
        success: true, 
        message: 'Birthday points automation already exists',
        automation_id: existing[0].id
      })
    }

    // Crear la nueva automatización
    const { data: newAutomation, error: insertError } = await supabase
      .from('automations')
      .insert(birthdayPointsAutomation)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating automation:', insertError)
      return NextResponse.json({ error: 'Error creating automation' }, { status: 500 })
    }

    console.log('✅ Birthday points automation created:', newAutomation)

    return NextResponse.json({
      success: true,
      message: 'Birthday points automation created successfully',
      automation: newAutomation
    })

  } catch (error: any) {
    console.error('❌ Error creating birthday automation:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Mostrar todas las automatizaciones de cumpleaños
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('automation_type', 'birthday')
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      automations: automations || [],
      count: automations?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
