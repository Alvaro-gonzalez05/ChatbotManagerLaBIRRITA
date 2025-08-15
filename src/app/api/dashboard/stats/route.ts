import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const business_id = searchParams.get('business_id')
    const today = new Date().toISOString().split('T')[0]
    
    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }
    
    // Get today's stats
    const [reservations, customers, pointLoads] = await Promise.all([
      supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business_id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z'),
      
      supabase
        .from('customers')
        .select('*')
        .eq('business_id', business_id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z'),
      
      supabase
        .from('point_loads')
        .select('*')
        .eq('business_id', business_id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')
    ])
    
    const stats = {
      reservationsToday: reservations.data?.length || 0,
      newCustomers: customers.data?.length || 0,
      messagesProcessed: 0, // This would come from message_history
      pointsEarned: pointLoads.data?.reduce((sum, load) => sum + load.points_awarded, 0) || 0,
      dailyRevenue: reservations.data?.reduce((sum, res) => sum + (res.total_amount || 0), 0) || 0,
    }
    
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}