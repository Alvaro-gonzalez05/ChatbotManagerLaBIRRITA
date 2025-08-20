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
    user: { email: 'test@example.com', id: 'mock-user-id' }, // Mock user
    businessUser: {
      id: 'mock-business-user-id',
      business_id: 'f2a24619-5016-490c-9dc9-dd08fd6549b3',
      user_id: 'mock-user-id',
      role: 'admin',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
      permissions: {
        dashboard: true,
        bot_configuration: true,
        client_management: true,
        reservations_dashboard: true,
        loyalty_program: true,
        reports_analytics: true,
        employee_management: true,
      }
    },
    business: {
      id: 'f2a24619-5016-490c-9dc9-dd08fd6549b3',
      name: 'La Birrita Garden',
      description: 'Un excelente restaurante en Mendoza',
      address: 'Av. San Martín 123, Mendoza',
      phone: '+54 261 123 4567',
      email: 'info@labirritagarden.com',
      working_hours: {
        monday: { open: '10:00', close: '22:00' },
        tuesday: { open: '10:00', close: '22:00' },
        wednesday: { open: '10:00', close: '22:00' },
        thursday: { open: '10:00', close: '22:00' },
        friday: { open: '10:00', close: '24:00' },
        saturday: { open: '10:00', close: '24:00' },
        sunday: { open: '12:00', close: '22:00' }
      },
      categories: ['restaurante', 'bar'],
      specialties: ['comida argentina', 'asados']
    },
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