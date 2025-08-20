'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { BusinessUser, UserPermissions, Business } from '@/types/database'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthState {
  user: User | null
  businessUser: BusinessUser | null
  business: Business | null
  permissions: UserPermissions | null
  loading: boolean
}

export function useAuthReal() {
  const [state, setState] = useState<AuthState>({
    user: null,
    businessUser: null,
    business: null,
    permissions: null,
    loading: true
  })
  
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserData(session.user)
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user)
      } else {
        setState({
          user: null,
          businessUser: null,
          business: null,
          permissions: null,
          loading: false
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (user: User) => {
    try {
      // Load business_user data
      const { data: businessUser, error: businessUserError } = await supabase
        .from('business_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (businessUserError) {
        console.error('Error loading business user:', businessUserError)
        console.error('Error details:', {
          message: businessUserError.message,
          code: businessUserError.code,
          details: businessUserError.details,
          hint: businessUserError.hint
        })
        setState(prev => ({ ...prev, user, loading: false }))
        return
      }

      // Load business data
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessUser.business_id)
        .single()

      if (businessError) {
        console.error('Error loading business:', businessError)
        console.error('Business error details:', {
          message: businessError.message,
          code: businessError.code,
          details: businessError.details,
          hint: businessError.hint
        })
        // Don't return here, continue with null business
      }

      setState({
        user,
        businessUser,
        business: business || null,
        permissions: businessUser.permissions || null,
        loading: false
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      setState(prev => ({ ...prev, user, loading: false }))
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      return { data: null, error }
    }
    
    return { data, error: null }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error && typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 1000)
    }
    return { error }
  }

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!state.permissions) return false
    return state.permissions[permission] === true
  }

  const updateUserData = async (userId: string, updates: Partial<BusinessUser>) => {
    const { data, error } = await supabase
      .from('business_users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error && data) {
      setState(prev => ({
        ...prev,
        businessUser: data
      }))
    }

    return { data, error }
  }

  const createEmployee = async (employeeData: {
    email: string
    password: string
    first_name: string
    last_name: string
    role: string
    permissions: UserPermissions
  }) => {
    // First create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: employeeData.email,
      password: employeeData.password,
      email_confirm: true
    })

    if (authError) {
      return { data: null, error: authError }
    }

    // Then create business_user record
    const { data: businessUserData, error: businessUserError } = await supabase
      .from('business_users')
      .insert({
        business_id: state.business?.id,
        user_id: authData.user.id,
        role: employeeData.role,
        permissions: employeeData.permissions,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        is_active: true,
        created_by: state.user?.id
      })
      .select()
      .single()

    return { data: businessUserData, error: businessUserError }
  }

  return {
    user: state.user,
    businessUser: state.businessUser,
    business: state.business,
    permissions: state.permissions,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    updateUserData,
    createEmployee,
    supabase
  }
}