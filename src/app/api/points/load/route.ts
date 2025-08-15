import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { customer_id, business_id, customer_phone, amount_spent, points_awarded, loaded_by } = await request.json()
    
    if (!customer_id || !business_id || !amount_spent || !points_awarded) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Start transaction - update customer and create point load record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('points, total_spent')
      .eq('id', customer_id)
      .single()
    
    if (customerError) throw customerError
    
    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        points: customer.points + points_awarded,
        total_spent: customer.total_spent + parseFloat(amount_spent),
        last_interaction: new Date().toISOString()
      })
      .eq('id', customer_id)
    
    if (updateError) throw updateError
    
    // Create point load record
    const { data: pointLoad, error: loadError } = await supabase
      .from('point_loads')
      .insert({
        business_id,
        customer_id,
        customer_phone,
        amount_spent: parseFloat(amount_spent),
        points_awarded,
        loaded_by,
      })
      .select()
    
    if (loadError) throw loadError
    
    return NextResponse.json({ 
      success: true, 
      pointLoad: pointLoad[0],
      newPoints: customer.points + points_awarded
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}