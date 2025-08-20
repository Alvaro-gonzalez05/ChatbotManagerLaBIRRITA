import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // Get customer points
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, points, total_spent, visit_count')
      .eq('phone', phoneNumber)
      .eq('business_id', businessId)
      .single()

    if (customerError) {
      console.error('Error fetching customer:', customerError)
      return NextResponse.json(
        { error: 'Customer not found', details: customerError.message },
        { status: 404 }
      )
    }

    // Get available redeemable items
    const { data: redeemableItems, error: itemsError } = await supabase
      .from('redeemable_items')
      .select('id, name, description, points_required, category, is_available, stock')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('points_required', { ascending: true })

    if (itemsError) {
      console.error('Error fetching redeemable items:', itemsError)
      // Don't fail the request if items can't be loaded, just return empty array
    }

    // Separate items into affordable and aspirational
    const customerPoints = customer.points || 0
    const affordableItems = redeemableItems?.filter(item => item.points_required <= customerPoints) || []
    const aspirationalItems = redeemableItems?.filter(item => 
      item.points_required > customerPoints && item.points_required <= customerPoints + 500
    ) || []

    return NextResponse.json({
      customer: {
        name: customer.name,
        points: customerPoints,
        total_spent: customer.total_spent || 0,
        visit_count: customer.visit_count || 0
      },
      rewards: {
        affordable: affordableItems,
        aspirational: aspirationalItems.slice(0, 3) // Show max 3 aspirational items
      }
    })

  } catch (error: any) {
    console.error('Error in loyalty points endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}