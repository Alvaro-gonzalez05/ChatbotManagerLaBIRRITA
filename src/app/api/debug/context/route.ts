import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usar Service Role Key para bypasear RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 })
    }

    // Buscar contexto de conversación para este teléfono
    const { data: context, error } = await supabase
      .from('conversation_context')
      .select('*')
      .eq('customer_phone', phone)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching context:', error)
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      phone,
      contextFound: context && context.length > 0,
      contexts: context || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug context error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
