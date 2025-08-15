'use client'

import { useState, useEffect } from 'react'

// Hook completamente mock para testear
export function useAuthMock() {
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    console.log('useAuthMock: useEffect ejecutándose - mounted')
    setMounted(true)
    
    const timer = setTimeout(() => {
      console.log('useAuthMock: cambiando a loading false')
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  console.log('useAuthMock render:', { loading, mounted })

  // Si no está mounted, siempre mostrar loading para evitar mismatch
  if (!mounted) {
    return {
      user: null,
      businessUser: null,
      business: null,
      permissions: null,
      loading: true,
      signIn: async () => ({ data: null, error: null }),
      signUp: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      hasPermission: () => false,
    }
  }

  return {
    user: { email: 'test@example.com' }, // Mock user
    businessUser: null,
    business: null,
    permissions: {
      dashboard: true,
      bot_configuration: true,
      client_management: true,
      reservations_dashboard: true,
      loyalty_program: true,
      reports_analytics: true,
      employee_management: true,
    },
    loading,
    signIn: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
    hasPermission: () => true,
  }
}