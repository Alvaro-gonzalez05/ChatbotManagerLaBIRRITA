import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ 
      status: 'Database connected successfully', 
      data: data || [] 
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Database connection failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}