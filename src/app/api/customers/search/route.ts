import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    const business_id = searchParams.get('business_id')
    
    if (!phone || !business_id) {
      return NextResponse.json(
        { error: 'phone and business_id are required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .eq('business_id', business_id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return NextResponse.json(data || null)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, businessId } = body

    if (!phoneNumber || !businessId) {
      return NextResponse.json(
        { error: 'Phone number and business ID are required' },
        { status: 400 }
      )
    }

    console.log(`Searching for customer with phone ${phoneNumber} in business ${businessId}`)

    // Search for existing customer
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, name, phone, created_at')
      .eq('phone', phoneNumber)
      .eq('business_id', businessId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error searching customer:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    if (customer) {
      // Customer exists
      return NextResponse.json({
        exists: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          created_at: customer.created_at
        }
      })
    } else {
      // Customer doesn't exist
      return NextResponse.json({
        exists: false,
        customer: null
      })
    }

  } catch (error: any) {
    console.error('Error in customer search endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}