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

// Global cache to prevent multiple simultaneous calls
let isLoadingUserData = false
let userDataCache: { [userId: string]: any } = {}

// Cache key for localStorage
const AUTH_CACHE_KEY = 'la-birrita-auth-state'

// Check if we have recent valid auth state in localStorage
const getCachedAuthState = (): Partial<AuthState> | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (!cached) return null
    
    const parsed = JSON.parse(cached)
    const now = Date.now()
    
    // Cache is valid for 5 minutes
    if (parsed.timestamp && (now - parsed.timestamp) < 5 * 60 * 1000 && parsed.hasUser) {
      console.log('📋 Found valid auth cache, user exists')
      return {
        user: parsed.user,
        businessUser: parsed.businessUser,
        business: parsed.business,
        permissions: parsed.permissions,
        loading: false
      }
    }
  } catch (error) {
    console.warn('❌ Failed to parse auth cache:', error)
  }
  
  return null
}

export function useAuthReal() {
  const [state, setState] = useState<AuthState>({
    user: null,
    businessUser: null,
    business: null,
    permissions: null,
    loading: true
  })
  
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Handle hydration and cache loading
  useEffect(() => {
    setIsHydrated(true)
    
    // Try to load from cache after hydration
    const cached = getCachedAuthState()
    if (cached) {
      console.log('🔄 useAuthReal loading from localStorage cache after hydration')
      setState({
        user: cached.user || null,
        businessUser: cached.businessUser || null,
        business: cached.business || null,
        permissions: cached.permissions || null,
        loading: false
      })
      return
    }
    
    console.log('🔄 useAuthReal hook initialized fresh, loading: true')
  }, [])
  
  // Save to cache when auth state is complete
  useEffect(() => {
    if (state.user && state.businessUser && !state.loading) {
      const cacheData = {
        user: state.user,
        businessUser: state.businessUser,
        business: state.business,
        permissions: state.permissions,
        hasUser: true,
        timestamp: Date.now()
      }
      
      try {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData))
        console.log('💾 Auth state cached to localStorage')
      } catch (error) {
        console.warn('❌ Failed to cache auth state:', error)
      }
    }
  }, [state])
  
  const supabase = createClient()

  useEffect(() => {
    // Don't run until after hydration to avoid SSR mismatch
    if (!isHydrated) return
    
    let mounted = true
    let timeoutId: NodeJS.Timeout

    // Get initial session with timeout
    const getSession = async () => {
      try {
        console.log('🔐 Getting initial session...')
        const sessionStartTime = Date.now()
        
        // Try to get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession()
        
        const sessionTime = Date.now() - sessionStartTime
        console.log(`⏱️ Session check took ${sessionTime}ms`)
        
        if (error) {
          console.error('Session error:', error)
          if (mounted) {
            setState(prev => ({ ...prev, loading: false }))
          }
          return
        }
        
        if (!mounted) return
        
        if (session?.user) {
          console.log('✅ Session found, loading user data...')
          await loadUserData(session.user)
        } else {
          console.log('❌ No session found')
          
          // Debug: Check if there's any auth data in localStorage
          if (typeof window !== 'undefined') {
            const authKeys = Object.keys(localStorage).filter(key => 
              key.includes('auth') || key.includes('supabase')
            )
            console.log('🔍 LocalStorage auth keys:', authKeys)
            
            authKeys.forEach(key => {
              const value = localStorage.getItem(key)
              console.log(`🔑 ${key}:`, value ? 'exists' : 'empty')
            })
          }
          
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Session error:', error)
        if (mounted) {
          console.warn('Failed to get session, setting loading to false')
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    // Add small delay to prevent rapid re-renders
    timeoutId = setTimeout(() => {
      if (mounted) {
        getSession()
      }
    }, 100)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state change:', event, !!session?.user)
      
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

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [isHydrated]) // Add isHydrated dependency

  const loadUserData = async (user: User, retryCount = 0) => {
    console.log(`🔄 Loading user data for: ${user.id} (attempt ${retryCount + 1})`)
    
    // Prevent multiple simultaneous calls for the same user
    if (isLoadingUserData && retryCount === 0) {
      console.log('⏸️ Already loading user data, skipping...')
      return
    }
    
    // Check cache first
    if (userDataCache[user.id] && retryCount === 0) {
      console.log('📋 Using cached user data')
      setState({
        user,
        businessUser: userDataCache[user.id].businessUser,
        business: userDataCache[user.id].business,
        permissions: userDataCache[user.id].permissions,
        loading: false
      })
      return
    }
    
    isLoadingUserData = true
    const startTime = Date.now()
    
    try {
      // More aggressive timeouts for better UX but longer for first try (cold start)
      const TIMEOUT = retryCount === 0 ? 10000 : 4000 // First attempt: 10s for cold start, retry: 4s
      const MAX_RETRIES = 1 // Only 1 retry to avoid long waits
      
      // Load business_user data with timeout and retry
      console.log('📊 Querying business_users table...')
      const businessUserStartTime = Date.now()
      
      const loadBusinessUserPromise = supabase
        .from('business_users')
        .select(`
          id,
          business_id,
          role,
          permissions,
          first_name,
          last_name,
          is_active
        `)
        .eq('user_id', user.id)
        .limit(1)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), TIMEOUT)
      )
      
      const { data: businessUser, error: businessUserError } = await Promise.race([
        loadBusinessUserPromise, 
        timeoutPromise
      ]) as any

      const businessUserTime = Date.now() - businessUserStartTime
      console.log(`⏱️ business_users query took ${businessUserTime}ms`)

      if (businessUserError) {
        console.error('❌ Error loading business user:', businessUserError)
        
        // If it's a timeout and we have retries left, try again
        if (businessUserError.message === 'Database timeout' && retryCount < MAX_RETRIES) {
          console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          return loadUserData(user, retryCount + 1)
        }
        
        // If it's a "not found" error, user might not be set up yet
        if (businessUserError.code === 'PGRST116') {
          console.log('👤 User not found in business_users table - this is normal for new users')
          const finalState = { 
            user, 
            businessUser: null, 
            business: null, 
            permissions: null, 
            loading: false 
          }
          setState(finalState)
          
          // Cache the "not found" result
          userDataCache[user.id] = {
            businessUser: null,
            business: null,
            permissions: null
          }
        } else {
          // For other errors, set user but no business data
          console.warn('⚠️ Setting user without business data due to error:', businessUserError.code)
          setState(prev => ({ ...prev, user, loading: false }))
        }
        isLoadingUserData = false
        return
      }

      // If we have business user but no business_id, continue with null business
      if (!businessUser.business_id) {
        console.log('Business user has no business_id')
        setState({
          user,
          businessUser,
          business: null,
          permissions: businessUser.permissions || null,
          loading: false
        })
        return
      }

      // Load business data with timeout (optional - continue if fails)
      try {
        console.log('🏢 Querying businesses table...')
        const businessStartTime = Date.now()
        
        const loadBusinessPromise = supabase
          .from('businesses')
          .select(`
            id,
            name,
            description,
            phone,
            email,
            address
          `)
          .eq('id', businessUser.business_id)
          .limit(1)
          .single()
        
        const { data: business, error: businessError } = await Promise.race([
          loadBusinessPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Business timeout')), 2000)
          )
        ]) as any

        const businessTime = Date.now() - businessStartTime
        console.log(`⏱️ businesses query took ${businessTime}ms`)

        if (businessError) {
          console.warn('⚠️ Error loading business (continuing without it):', businessError.message)
        }

        const finalState = {
          user,
          businessUser,
          business: business || null,
          permissions: businessUser.permissions || null,
          loading: false
        }
        
        console.log('✅ Setting final auth state:', {
          hasUser: !!finalState.user,
          hasBusinessUser: !!finalState.businessUser,
          hasBusiness: !!finalState.business,
          loading: finalState.loading
        })
        
        setState(finalState)
        
        // Cache the result for future use
        userDataCache[user.id] = {
          businessUser: finalState.businessUser,
          business: finalState.business,
          permissions: finalState.permissions
        }
      } catch (businessError) {
        const totalTime = Date.now() - startTime
        console.warn(`⚠️ Business load failed after ${totalTime}ms, continuing without business data`)
        
        const finalState = {
          user,
          businessUser,
          business: null,
          permissions: businessUser.permissions || null,
          loading: false
        }
        
        setState(finalState)
        
        // Cache the result even with failed business load
        userDataCache[user.id] = {
          businessUser: finalState.businessUser,
          business: finalState.business,
          permissions: finalState.permissions
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`✅ User data loaded successfully in ${totalTime}ms`)
    } catch (error) {
      const totalTime = Date.now() - startTime
      console.error(`❌ Error loading user data after ${totalTime}ms:`, error)
      // Always set loading to false to prevent infinite loading
      setState(prev => ({ ...prev, user, loading: false }))
    } finally {
      isLoadingUserData = false
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