'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  LayoutDashboard, 
  Coins, 
  Bot, 
  Users, 
  Calendar, 
  Gift, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission: keyof import('@/types/database').UserPermissions
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Configuración del Bot', href: '/dashboard/bot', icon: Bot, permission: 'bot_configuration' },
  { name: 'Gestión de Clientes', href: '/dashboard/customers', icon: Users, permission: 'client_management' },
  { name: 'Reservas', href: '/dashboard/reservations', icon: Calendar, permission: 'reservations_dashboard' },
  { name: 'Programa Fidelidad', href: '/dashboard/loyalty', icon: Gift, permission: 'loyalty_program' },
  { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3, permission: 'reports_analytics' },
  { name: 'Empleados', href: '/dashboard/employees', icon: Settings, permission: 'employee_management' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, businessUser, hasPermission, signOut, loading } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  console.log('DashboardLayout render:', { user: !!user, loading, pathname })

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        toast.error('Error al cerrar sesión')
      } else {
        toast.success('Sesión cerrada')
        // La redirección la maneja el hook useAuth
      }
    } catch (error) {
      console.error('Error during sign out:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If no user, redirect to auth instead of showing loading
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const filteredNavigation = navigation.filter(item => hasPermission(item.permission))

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <h1 className="text-xl font-bold text-foreground">
              <span className="text-orange-500">LA BIRRITA</span>
              <span className="text-black"> BOT MANAGER</span>
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-border">
            <p className="font-medium text-sm">
              Bienvenido/a, {businessUser?.first_name || user?.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {businessUser?.role === 'owner' ? 'Administrador' : businessUser?.role || 'Admin'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start animate-scale-hover ${
                      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">
            <span className="text-orange-500">LA BIRRITA</span>
            <span className="text-black"> BOT MANAGER</span>
          </h1>
          <div className="w-8" />
        </div>

        {/* Page content */}
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}