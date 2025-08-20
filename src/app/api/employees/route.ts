import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await request.json()
    
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      business_id, 
      permissions,
      created_by 
    } = body

    // Validate required fields
    if (!email || !password || !first_name || !business_id) {
      return NextResponse.json(
        { error: 'Email, password, first_name and business_id are required' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role: 'employee'
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create business_user record
    const { data: businessUserData, error: businessUserError } = await supabaseAdmin
      .from('business_users')
      .insert({
        business_id,
        user_id: authData.user.id,
        role: 'employee',
        permissions,
        first_name,
        last_name,
        is_active: true,
        created_by
      })
      .select()
      .single()

    if (businessUserError) {
      // If business_user creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: businessUserError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Employee created successfully',
      user: {
        id: businessUserData.id,
        email: authData.user.email,
        first_name: businessUserData.first_name,
        last_name: businessUserData.last_name,
        role: businessUserData.role,
        permissions: businessUserData.permissions,
        created_at: businessUserData.created_at
      }
    })

  } catch (error: any) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    // Get business_users
    const { data: businessUsers, error: businessUsersError } = await supabaseAdmin
      .from('business_users')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (businessUsersError) {
      return NextResponse.json(
        { error: businessUsersError.message },
        { status: 400 }
      )
    }

    // Get auth info for each user
    const employeesWithAuth = await Promise.all(
      businessUsers.map(async (businessUser) => {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(businessUser.user_id)
          
          return {
            ...businessUser,
            email: userData.user?.email || 'Sin email',
            last_sign_in: userData.user?.last_sign_in_at || null,
            is_confirmed: !!userData.user?.email_confirmed_at
          }
        } catch (error) {
          return {
            ...businessUser,
            email: 'Sin email',
            last_sign_in: null,
            is_confirmed: false
          }
        }
      })
    )

    return NextResponse.json({
      employees: employeesWithAuth
    })

  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}