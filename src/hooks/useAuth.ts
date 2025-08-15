'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { BusinessUser, UserPermissions, Business } from '@/types/database'
import { toast } from 'sonner'

interface AuthState {
  user: User | null
  businessUser: BusinessUser | null
  business: Business | null
  permissions: UserPermissions | null
  loading: boolean
}

// Mock permissions for simplicity
const defaultPermissions: UserPermissions = {
  dashboard: true,
  point_loading: true,
  bot_configuration: true,
  client_management: true,
  reservations_dashboard: true,
  loyalty_program: true,
  reports_analytics: true,
  employee_management: true,
}

// Mock business data to fix the loading issue
const mockBusiness: Business = {
  id: 'f2a24619-5016-490c-9dc9-dd08fd6549b3',
  owner_id: 'mock-owner-id',
  name: 'Mi Negocio Demo',
  phone: '+54 261 123 4567',
  email: 'negocio@example.com',
  address: 'Av. San Martín 123, Mendoza',
  description: 'Un negocio de ejemplo para testing',
  logo_url: null,
  categories: ['restaurante', 'bar'],
  specialties: ['comida argentina', 'asados'],
  website: null,
  working_hours: {
    monday: { open: '10:00', close: '22:00' },
    tuesday: { open: '10:00', close: '22:00' },
    wednesday: { open: '10:00', close: '22:00' },
    thursday: { open: '10:00', close: '22:00' },
    friday: { open: '10:00', close: '24:00' },
    saturday: { open: '10:00', close: '24:00' },
    sunday: { open: '12:00', close: '22:00' }
  },
  timezone: 'America/Argentina/Mendoza',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Por defecto autenticado para testing
  const [currentUserType, setCurrentUserType] = useState<'admin' | 'employee'>('admin')
  
  console.log('useAuth render: returning mock data with business', { isAuthenticated, currentUserType })

  // Mock user data
  const mockUser = isAuthenticated ? { 
    id: 'mock-user-id',
    email: 'admin@sistema.com' 
  } as any : null

  // Define different permission sets
  const adminPermissions: UserPermissions = {
    dashboard: true,
    point_loading: true,
    bot_configuration: true,
    client_management: true,
    reservations_dashboard: true,
    loyalty_program: true,
    reports_analytics: true,
    employee_management: true,
  }

  const employeePermissions: UserPermissions = {
    dashboard: true,
    point_loading: true,
    bot_configuration: false,
    client_management: true,
    reservations_dashboard: false,
    loyalty_program: false,
    reports_analytics: false,
    employee_management: false,
  }

  const mockBusinessUser: BusinessUser = {
    id: 'mock-business-user-id',
    business_id: mockBusiness.id,
    user_id: 'mock-user-id',
    role: currentUserType === 'admin' ? 'admin' : 'employee',
    permissions: currentUserType === 'admin' ? adminPermissions : employeePermissions,
    first_name: currentUserType === 'admin' ? 'Usuario' : 'María',
    last_name: currentUserType === 'admin' ? 'Administrador' : 'González',
    is_active: true,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const signIn = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock users database
    const mockUsers = {
      'admin@labirrita.com': { type: 'admin' as const, password: 'admin123' },
      'maria@labirrita.com': { type: 'employee' as const, password: 'maria123' },
      'carlos@labirrita.com': { type: 'employee' as const, password: 'carlos123' },
    }
    
    const user = mockUsers[email as keyof typeof mockUsers]
    
    if (!user || user.password !== password) {
      return { data: null, error: { message: 'Credenciales inválidas' } }
    }
    
    // Set authenticated and user type
    setIsAuthenticated(true)
    setCurrentUserType(user.type)
    
    return { data: { user: { email } }, error: null }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    return { data: null, error: null }
  }

  const signOut = async () => {
    console.log('signOut called - clearing session and redirecting...')
    setIsAuthenticated(false)
    
    // Clear any local session data if needed
    if (typeof window !== 'undefined') {
      // Pequeño delay para mostrar el toast
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 1000)
    }
    return { error: null }
  }

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    const currentPermissions = currentUserType === 'admin' ? adminPermissions : employeePermissions
    return currentPermissions[permission] === true
  }

  const switchUser = (userType: 'admin' | 'employee') => {
    setCurrentUserType(userType)
    toast.success(`Cambiado a usuario ${userType === 'admin' ? 'administrador' : 'empleado'}`)
  }

  return {
    user: mockUser,
    businessUser: isAuthenticated ? mockBusinessUser : null,
    business: isAuthenticated ? mockBusiness : null,
    permissions: isAuthenticated ? (currentUserType === 'admin' ? adminPermissions : employeePermissions) : null,
    loading: false,
    signIn,
    signUp,
    signOut,
    hasPermission,
    switchUser,
    currentUserType
  }
}