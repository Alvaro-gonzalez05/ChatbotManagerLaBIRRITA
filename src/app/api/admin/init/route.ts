import { NextRequest, NextResponse } from 'next/server'
import { createAdminUser } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { data, error } = await createAdminUser()
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        message: 'Admin user initialized successfully',
        user_id: data?.user?.id 
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}