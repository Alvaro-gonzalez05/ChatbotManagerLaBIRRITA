import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AutomationEventSystem } from '@/services/automationEventSystem'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const eventSystem = new AutomationEventSystem()

// Get customers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const business_id = searchParams.get('business_id')
    
    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id)
      .order('last_interaction', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Create customer
export async function POST(request: NextRequest) {
  try {
    const customerData = await request.json()
    
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
    
    if (error) throw error
    
    // 🚀 EVENT-DRIVEN: Disparar evento de cliente registrado
    if (data && data[0]) {
      console.log(`🚀 EVENT: Cliente registrado - ${data[0].name} (${data[0].business_id})`)
      
      // Disparar evento async para no bloquear la respuesta
      setImmediate(async () => {
        try {
          await eventSystem.onCustomerRegistered(data[0])
        } catch (eventError) {
          console.error('Error procesando evento de cliente registrado:', eventError)
        }
      })
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}