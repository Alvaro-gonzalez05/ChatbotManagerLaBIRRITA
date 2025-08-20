import { createClient } from '@supabase/supabase-js'

// Server-side admin client for backend operations
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Create admin client with service role key
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createAdminUser() {
  try {
    // First check if admin user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUsers.users.find(user => user.email === 'admin@labirrita.com')
    
    if (adminExists) {
      console.log('Admin user already exists:', adminExists.id)
      return { data: adminExists, error: null }
    }

    // Create the admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@labirrita.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        first_name: 'Administrador',
        last_name: 'Principal',
        role: 'admin'
      }
    })

    if (userError) {
      console.error('Error creating admin user:', userError)
      return { data: null, error: userError }
    }

    console.log('Admin user created successfully:', userData.user.id)

    // Get the business ID (assuming we have one business)
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)
      .single()

    if (businessError) {
      console.error('Error getting business:', businessError)
      return { data: userData, error: businessError }
    }

    // Create business_user record
    const { data: businessUserData, error: businessUserError } = await supabaseAdmin
      .from('business_users')
      .insert({
        business_id: business.id,
        user_id: userData.user.id,
        role: 'admin',
        permissions: {
          dashboard: true,
          point_loading: true,
          bot_configuration: true,
          client_management: true,
          reservations_dashboard: true,
          loyalty_program: true,
          reports_analytics: true,
          employee_management: true,
        },
        first_name: 'Administrador',
        last_name: 'Principal',
        is_active: true,
        created_by: null
      })
      .select()
      .single()

    if (businessUserError) {
      console.error('Error creating business_user:', businessUserError)
      return { data: userData, error: businessUserError }
    }

    console.log('Business user created successfully:', businessUserData.id)
    return { data: userData, error: null }

  } catch (error) {
    console.error('Unexpected error creating admin user:', error)
    return { data: null, error }
  }
}