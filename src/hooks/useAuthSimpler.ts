'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
}

export function useAuthSimpler() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    let mounted = true
    
    console.log('🚀 Simple auth hook starting...')
    
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          console.log('📋 Initial session:', session ? 'found' : 'not found')
          setState({
            user: session?.user || null,
            loading: false,
            initialized: true
          })
        }
      } catch (error) {
        console.error('❌ Auth init error:', error)
        if (mounted) {
          setState({
            user: null,
            loading: false,
            initialized: true
          })
        }
      }
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session ? 'user logged in' : 'no user')
      
      if (mounted) {
        setState({
          user: session?.user || null,
          loading: false,
          initialized: true
        })
      }
    })
    
    initAuth()
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }
  
  return {
    user: state.user,
    loading: state.loading,
    initialized: state.initialized,
    signOut
  }
}
