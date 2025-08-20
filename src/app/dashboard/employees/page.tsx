'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield,
  ShieldCheck,
  UserPlus,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { BusinessUser, UserPermissions } from '@/types/database'

interface EmployeeWithAuth extends BusinessUser {
  email?: string
  last_sign_in?: string
  is_confirmed?: boolean
}

export default function EmployeesPage() {
  const { business, businessUser, user } = useAuth()
  const [employees, setEmployees] = useState<EmployeeWithAuth[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithAuth | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    permissions: {
      dashboard: true,
      point_loading: true,
      bot_configuration: false,
      client_management: false,
      reservations_dashboard: false,
      loyalty_program: false,
      reports_analytics: false,
      employee_management: false
    } as UserPermissions
  })

  const supabase = createClient()

  // Check if current user has permission to manage employees
  const canManageEmployees = businessUser?.role === 'admin' || businessUser?.role === 'owner' || businessUser?.permissions?.employee_management

  const permissionLabels = {
    dashboard: { label: 'Dashboard', description: 'Acceso al panel principal', required: true },
    point_loading: { label: 'Carga de Puntos', description: 'Cargar puntos a clientes', required: true },
    bot_configuration: { label: 'Configuración del Bot', description: 'Configurar chatbot y automatizaciones' },
    client_management: { label: 'Gestión de Clientes', description: 'Ver y editar información de clientes' },
    reservations_dashboard: { label: 'Dashboard de Reservas', description: 'Gestionar reservas de cena y baile' },
    loyalty_program: { label: 'Programa de Fidelidad', description: 'Configurar puntos y niveles VIP' },
    reports_analytics: { label: 'Reportes y Analytics', description: 'Ver estadísticas y reportes' },
    employee_management: { label: 'Gestión de Empleados', description: 'Crear y gestionar empleados (Solo Admin)' }
  }

  useEffect(() => {
    if (business?.id && canManageEmployees) {
      loadEmployees()
    }
  }, [business?.id, canManageEmployees])

  const loadEmployees = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      // Use our API route instead of direct database queries
      const response = await fetch(`/api/employees?business_id=${business.id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load employees')
      }
      
      const { employees: employeesData } = await response.json()
      setEmployees(employeesData || [])
      console.log('Loaded employees from API:', employeesData?.length || 0)
      
    } catch (error: any) {
      console.error('Error loading employees:', error)
      toast.error(`Error al cargar empleados: ${error.message}`)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }


  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const password = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setGeneratedPassword(password)
    setFormData({ ...formData, password })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!business?.id || !formData.email || !formData.first_name) {
      toast.error('Email y nombre son requeridos')
      return
    }

    if (!editingEmployee && !formData.password) {
      toast.error('Ingresa una contraseña para el nuevo empleado')
      return
    }

    setLoading(true)

    try {
      if (editingEmployee) {
        // Update existing employee
        const response = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password || undefined, // Only update if provided
            first_name: formData.first_name,
            last_name: formData.last_name,
            permissions: formData.permissions,
            is_active: true
          })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update employee')
        }
        
        toast.success('Empleado actualizado correctamente')
      } else {
        // Create new employee
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            business_id: business.id,
            permissions: formData.permissions,
            created_by: businessUser?.user_id
          })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create employee')
        }
        
        toast.success('Empleado creado correctamente')
        toast.success(`Contraseña: ${formData.password}`, {
          duration: 10000
        })
      }

      resetForm()
      loadEmployees()
      
    } catch (error: any) {
      console.error('Error saving employee:', error)
      toast.error('Error al guardar empleado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (employee: EmployeeWithAuth) => {
    setEditingEmployee(employee)
    setFormData({
      email: employee.email || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      password: '',
      permissions: employee.permissions as UserPermissions
    })
    setIsAddModalOpen(true)
  }

  const handleToggleStatus = async (employee: EmployeeWithAuth) => {
    try {
      const { error } = await supabase
        .from('business_users')
        .update({ 
          is_active: !employee.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id)
      
      if (error) {
        if (error.message?.includes('permission') || error.message?.includes('policy')) {
          toast.error('Sin permisos para modificar empleados. Verifique las políticas RLS.')
        } else {
          toast.error(`Error al cambiar estado: ${error.message}`)
        }
        return
      }
      
      toast.success(`Empleado ${!employee.is_active ? 'activado' : 'desactivado'} correctamente`)
      loadEmployees()
    } catch (error: any) {
      toast.error(`Error de conexión: ${error.message || 'No se pudo actualizar el empleado'}`)
    }
  }

  const handleDelete = async (employee: EmployeeWithAuth) => {
    // Prevent deleting yourself
    if (employee.user_id === user?.id) {
      toast.error('No puedes eliminarte a ti mismo')
      return
    }

    const roleText = employee.role === 'admin' ? 'administrador' : 'empleado'
    const roleTextCapitalized = employee.role === 'admin' ? 'Administrador' : 'Empleado'
    
    // Create elegant confirmation toast with Sonner
    toast(
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              ¿Eliminar {roleText}?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará permanentemente a <span className="font-medium">{employee.first_name} {employee.last_name}</span>. 
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-13">
          <button
            onClick={() => {
              toast.dismiss()
              performDelete(employee, roleTextCapitalized)
            }}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={() => toast.dismiss()}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        duration: Infinity, // Don't auto-dismiss
        position: 'top-center',
        className: 'w-96',
      }
    )
  }

  const performDelete = async (employee: EmployeeWithAuth, roleText: string) => {
    setLoading(true)

    try {
      // Use our API route for deletion
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete employee')
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>{roleText} eliminado correctamente</span>
        </div>,
        {
          duration: 4000,
        }
      )
      loadEmployees()
      
    } catch (error: any) {
      console.error('Error deleting employee:', error)
      toast.error(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span>Error al eliminar: {error.message}</span>
        </div>,
        {
          duration: 5000,
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      permissions: {
        dashboard: true,
        point_loading: true,
        bot_configuration: false,
        client_management: false,
        reservations_dashboard: false,
        loyalty_program: false,
        reports_analytics: false,
        employee_management: false
      }
    })
    setEditingEmployee(null)
    setGeneratedPassword('')
    setIsAddModalOpen(false)
  }

  const updatePermission = (permission: keyof UserPermissions, value: boolean) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: value
      }
    })
  }

  const formatLastSignIn = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActiveEmployees = () => employees.filter(e => e.is_active).length
  const getInactiveEmployees = () => employees.filter(e => !e.is_active).length
  const getAdminEmployees = () => employees.filter(e => e.role === 'admin').length

  if (!canManageEmployees) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center">
              No tienes permisos para gestionar empleados. Solo los administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show setup info if no employees loaded
  if (!loading && employees.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Empleados</h1>
            <p className="text-muted-foreground">
              Administra los empleados y sus permisos en el sistema
            </p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-500" />
              Problemas de Permisos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Para gestionar empleados, necesitas configurar lo siguiente en Supabase:
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Base de Datos:</h4>
                <div className="ml-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Tabla <code className="bg-muted px-1 rounded">business_users</code> creada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Políticas RLS configuradas para <code className="bg-muted px-1 rounded">business_users</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Foreign Key: <code className="bg-muted px-1 rounded">user_id</code> → <code className="bg-muted px-1 rounded">auth.users.id</code> (opcional)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Autenticación:</h4>
                <div className="ml-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Service Role Key en variables de entorno</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">Permisos de administrador para <code className="bg-muted px-1 rounded">auth.admin</code></span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> La aplicación funciona con configuración básica, pero las relaciones de tablas mejoran la experiencia.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Empleados</h1>
          <p className="text-muted-foreground">
            Administra los empleados y sus permisos en el sistema
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="animate-scale-hover" onClick={resetForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar Empleado
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee 
                  ? 'Modifica la información del empleado y sus permisos' 
                  : 'Crea un nuevo empleado con acceso al sistema'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Información Personal
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      placeholder="Juan"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      placeholder="Pérez"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="empleado@empresa.com"
                    required
                    disabled={!!editingEmployee}
                  />
                  {editingEmployee && (
                    <p className="text-xs text-muted-foreground">
                      El email no se puede modificar después de crear el empleado
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingEmployee ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder={editingEmployee ? "Dejar vacío para no cambiar" : "Ingresa una contraseña"}
                    />
                    {!editingEmployee && (
                      <Button type="button" onClick={generatePassword} variant="outline">
                        Generar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingEmployee 
                      ? 'Deja vacío si no quieres cambiar la contraseña'
                      : 'El empleado podrá cambiar esta contraseña después del primer inicio de sesión'
                    }
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Permisos del Sistema
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(permissionLabels).map(([key, config]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{config.label}</Label>
                          {config.required && (
                            <Badge variant="secondary" className="text-xs">Obligatorio</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.description}
                        </p>
                      </div>
                      <Switch
                        checked={formData.permissions[key as keyof UserPermissions]}
                        onCheckedChange={(checked) => updatePermission(key as keyof UserPermissions, checked)}
                        disabled={config.required}
                      />
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Resumen de Permisos</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(formData.permissions)
                      .filter(([_, enabled]) => enabled)
                      .map(([permission, _]) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permissionLabels[permission as keyof UserPermissions]?.label}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : editingEmployee ? 'Actualizar' : 'Crear Empleado'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up">
        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{employees.length}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getActiveEmployees()}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Inactivos</CardTitle>
            <Shield className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{getInactiveEmployees()}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getAdminEmployees()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Lista de Empleados</CardTitle>
          <CardDescription>
            Todos los empleados con acceso al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay empleados registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </p>
                          {!employee.is_confirmed && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Email no confirmado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <p className="text-sm">
                          {employee.email}
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                          {employee.role === 'admin' ? 'Administrador' : 'Empleado'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {Object.entries(employee.permissions as UserPermissions)
                              .filter(([_, enabled]) => enabled)
                              .length} permisos
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(employee.permissions as UserPermissions)
                              .filter(([_, enabled]) => enabled)
                              .slice(0, 3)
                              .map(([permission, _]) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {permissionLabels[permission as keyof UserPermissions]?.label}
                                </Badge>
                              ))}
                            {Object.entries(employee.permissions as UserPermissions)
                              .filter(([_, enabled]) => enabled).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.entries(employee.permissions as UserPermissions)
                                  .filter(([_, enabled]) => enabled).length - 3} más
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastSignIn(employee.last_sign_in)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={employee.is_active ? 'secondary' : 'outline'}
                            className={employee.is_active ? 'bg-green-100 text-green-800' : ''}
                          >
                            {employee.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={`Eliminar ${employee.role === 'admin' ? 'administrador' : 'empleado'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}