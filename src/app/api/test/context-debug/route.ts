import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone') || '5492616977056'
    const businessId = searchParams.get('businessId') || 'f2a24619-5016-490c-9dc9-dd08fd6549b3'

    const supabase = createClient()

    // Obtener contexto actual
    const { data: context, error: contextError } = await supabase
      .from('conversation_context')
      .select('*')
      .eq('customer_phone', phone)
      .eq('business_id', businessId)
      .single()

    // Obtener todos los contextos para este negocio
    const { data: allContexts, error: allError } = await supabase
      .from('conversation_context')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      phone,
      businessId,
      currentContext: context,
      contextError: contextError?.message,
      allContexts,
      contextCount: allContexts?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error checking context:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone') || '5492616977056'
    const businessId = searchParams.get('businessId') || 'f2a24619-5016-490c-9dc9-dd08fd6549b3'

    const supabase = createClient()

    // Limpiar contexto específico
    const { error } = await supabase
      .from('conversation_context')
      .delete()
      .eq('customer_phone', phone)
      .eq('business_id', businessId)

    return NextResponse.json({
      success: true,
      message: `Context cleared for ${phone}`,
      error: error?.message
    })

  } catch (error: any) {
    console.error('Error clearing context:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
