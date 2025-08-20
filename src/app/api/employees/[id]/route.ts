import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await request.json()
    const employeeId = params.id
    
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      permissions,
      is_active
    } = body

    // Get the current business_user to find user_id
    const { data: currentEmployee, error: currentError } = await supabaseAdmin
      .from('business_users')
      .select('user_id')
      .eq('id', employeeId)
      .single()

    if (currentError) {
      return NextResponse.json(
        { error: currentError.message },
        { status: 400 }
      )
    }

    // Update business_user data
    const { error: businessUserError } = await supabaseAdmin
      .from('business_users')
      .update({
        first_name,
        last_name,
        permissions,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)

    if (businessUserError) {
      return NextResponse.json(
        { error: businessUserError.message },
        { status: 400 }
      )
    }

    // Update auth user if email or password changed
    if (email || password) {
      const updateData: any = {}
      if (email) updateData.email = email
      if (password) updateData.password = password

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        currentEmployee.user_id,
        updateData
      )

      if (authError) {
        return NextResponse.json(
          { error: `Employee updated but auth failed: ${authError.message}` },
          { status: 207 } // Partial success
        )
      }
    }

    return NextResponse.json({
      message: 'Employee updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseAdmin = createAdminClient()
    const employeeId = params.id

    // Get the business_user to find user_id
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('business_users')
      .select('user_id')
      .eq('id', employeeId)
      .single()

    if (employeeError) {
      return NextResponse.json(
        { error: employeeError.message },
        { status: 400 }
      )
    }

    // Delete business_user record
    const { error: deleteError } = await supabaseAdmin
      .from('business_users')
      .delete()
      .eq('id', employeeId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      )
    }

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      employee.user_id
    )

    if (authDeleteError) {
      console.warn('Auth user deletion failed:', authDeleteError.message)
      // Continue anyway, business_user is deleted
    }

    return NextResponse.json({
      message: 'Employee deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}