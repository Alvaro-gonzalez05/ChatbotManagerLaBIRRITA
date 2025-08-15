'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
}

export function useAuthSimple() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true
    
    const getSession = async () => {
      try {
        console.log('useAuthSimple: Getting session...')
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('useAuthSimple: Session result:', { hasSession: !!session, error })
        
        if (mounted) {
          setAuthState({
            user: session?.user || null,
            loading: false,
          })
        }
      } catch (error) {
        console.error('useAuthSimple: Error:', error)
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
          })
        }
      }
    }

    getSession()

    return () => {
      mounted = false
    }
  }, [])

  return authState
}