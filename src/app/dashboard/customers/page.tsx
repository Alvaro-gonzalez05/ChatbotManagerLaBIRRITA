'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
  Search, 
  Edit, 
  Trash2, 
  MessageCircle,
  Gift,
  Calendar,
  Phone,
  Instagram,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { Customer } from '@/types/database'

export default function CustomersPage() {
  const { business } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    instagram_username: '',
    birthday: '',
    points: 0,
    notes: '',
    tags: [] as string[]
  })

  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadCustomers()
    }
  }, [business?.id])

  useEffect(() => {
    // Filter customers based on search term
    const filtered = customers.filter(customer => 
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.instagram_username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCustomers(filtered)
  }, [customers, searchTerm])

  const loadCustomers = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('last_interaction', { ascending: false })
      
      if (error) {
        console.warn('Error loading customers from database:', error.message)
        // If there's an error (e.g., no database connection), use mock data
        const mockCustomers: Customer[] = [
          {
            id: '1',
            business_id: business.id,
            phone: '+54 261 123 4567',
            name: 'Juan Pérez',
            email: 'juan.perez@email.com',
            instagram_username: '@juanperez',
            birthday: '1985-05-15',
            points: 150,
            total_spent: 2500,
            visit_count: 8,
            first_interaction: '2024-01-15T10:00:00Z',
            last_interaction: '2024-08-10T19:30:00Z',
            status: 'active',
            notes: 'Cliente frecuente, prefiere mesa del fondo',
            tags: ['vip', 'frecuente'],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-08-10T19:30:00Z'
          },
          {
            id: '2',
            business_id: business.id,
            phone: '+54 261 987 6543',
            name: 'María González',
            email: 'maria.gonzalez@email.com',
            instagram_username: '@mariag',
            birthday: '1992-09-23',
            points: 85,
            total_spent: 1200,
            visit_count: 4,
            first_interaction: '2024-03-20T18:00:00Z',
            last_interaction: '2024-08-05T20:15:00Z',
            status: 'active',
            notes: 'Vegetariana, cumple en septiembre',
            tags: ['vegetariana'],
            created_at: '2024-03-20T18:00:00Z',
            updated_at: '2024-08-05T20:15:00Z'
          },
          {
            id: '3',
            business_id: business.id,
            phone: '+54 261 456 7890',
            name: 'Carlos Rodríguez',
            email: 'carlos.rodriguez@email.com',
            instagram_username: null,
            birthday: null,
            points: 200,
            total_spent: 3200,
            visit_count: 12,
            first_interaction: '2023-11-10T16:30:00Z',
            last_interaction: '2024-08-01T21:45:00Z',
            status: 'active',
            notes: 'Siempre viene con la familia los domingos',
            tags: ['familia', 'domingos'],
            created_at: '2023-11-10T16:30:00Z',
            updated_at: '2024-08-01T21:45:00Z'
          }
        ]
        setCustomers(mockCustomers)
        toast.success('Mostrando datos de prueba (sin conexión a base de datos)')
      } else {
        setCustomers(data || [])
      }
    } catch (error: any) {
      console.error('Error loading customers:', error)
      toast.error('Error al cargar clientes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función para otorgar puntos de bienvenida a nuevos clientes
  const awardWelcomePointsToNewCustomer = async (customerId: string, businessId: string, customerData?: any) => {
    try {
      console.log('🎁 Starting welcome points process for customer:', customerId)

      // Obtener configuración de loyalty
      const { data: loyaltySettings, error: loyaltyError } = await supabase
        .from('loyalty_settings')
        .select('welcome_points')
        .eq('business_id', businessId)
        .single()

      if (loyaltyError || !loyaltySettings?.welcome_points || loyaltySettings.welcome_points <= 0) {
        console.log('No welcome points configured')
        return
      }

      const welcomePoints = loyaltySettings.welcome_points
      console.log('🎁 Welcome points configured:', welcomePoints)

      // Usar los datos del cliente que ya tenemos
      const customerPhone = customerData?.phone || customerData?.phone_number || ''
      console.log('✅ Using customer phone:', customerPhone)

      // Actualizar puntos del cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ points: welcomePoints })
        .eq('id', customerId)

      if (updateError) {
        console.error('Error updating customer points:', updateError)
        return
      }

      // Verificar si ya se otorgaron puntos de bienvenida antes (simplificado)
      const { data: existingPointLoads, error: checkError } = await supabase
        .from('point_loads')
        .select('id')
        .eq('customer_id', customerId)
        .eq('amount_spent', 0)
        .gte('points_awarded', 50) // Puntos que indican bienvenida

      if (checkError) {
        console.error('Error checking existing point loads:', checkError)
        // Continuar aunque haya error en el check
      }

      if (existingPointLoads && existingPointLoads.length > 0) {
        console.log('⚠️ Welcome points already awarded to this customer')
        toast.info('Los puntos de bienvenida ya fueron otorgados a este cliente')
        return
      }

      // Registrar la carga de puntos (loaded_by como null para sistema)
      console.log('📝 Inserting point load record with data:', {
        business_id: businessId,
        customer_id: customerId,
        customer_phone: customerPhone,
        amount_spent: 0,
        points_awarded: welcomePoints,
        loaded_by: null
      })

      const { error: pointLoadError } = await supabase
        .from('point_loads')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          customer_phone: customerPhone,
          amount_spent: 0,
          points_awarded: welcomePoints,
          loaded_by: null
        })

      if (pointLoadError) {
        console.error('Error recording point load:', pointLoadError)
        console.error('Point load error details:', JSON.stringify(pointLoadError, null, 2))
        return
      }

      console.log(`✅ Welcome points awarded: ${welcomePoints} points to customer ${customerId}`)
      toast.success(`¡${welcomePoints} puntos de bienvenida otorgados!`)

    } catch (error) {
      console.error('Error awarding welcome points:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!business?.id || !formData.phone || !formData.name) {
      toast.error('Nombre y teléfono son requeridos')
      return
    }

    setLoading(true)

    try {
      const customerData = {
        business_id: business.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        instagram_username: formData.instagram_username || null,
        birthday: formData.birthday || null,
        points: editingCustomer ? formData.points : 0, // Nuevos clientes empiezan con 0 puntos
        notes: formData.notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        status: 'active'
      }

      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id)
        
        if (error) throw error
        toast.success('Cliente actualizado correctamente')
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single()
        
        if (error) throw error

        console.log('✅ Customer created successfully:', newCustomer)

        // Otorgar puntos de bienvenida si está configurado
        if (business?.id && newCustomer?.id) {
          console.log('🎁 Attempting to award welcome points to customer:', newCustomer.id)
          await awardWelcomePointsToNewCustomer(newCustomer.id, business.id, newCustomer)
        } else {
          console.log('⚠️ Missing business ID or customer ID for welcome points')
        }
        
        toast.success('Cliente creado correctamente')
      }

      // Reset form and reload customers
      resetForm()
      loadCustomers()
      
    } catch (error: any) {
      toast.error('Error al guardar cliente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      phone: customer.phone,
      email: customer.email || '',
      instagram_username: customer.instagram_username || '',
      birthday: customer.birthday || '',
      points: customer.points,
      notes: customer.notes || '',
      tags: customer.tags || []
    })
    setIsAddModalOpen(true)
  }

  const handleDelete = async (customer: Customer) => {
    // Create elegant confirmation toast with Sonner
    toast(
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              ¿Eliminar cliente?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará permanentemente a <span className="font-medium">{customer.name || customer.phone}</span>. 
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-13">
          <button
            onClick={() => {
              toast.dismiss()
              performDeleteCustomer(customer)
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

  const performDeleteCustomer = async (customer: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)
      
      if (error) throw error
      
      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Cliente eliminado correctamente</span>
        </div>,
        {
          duration: 4000,
        }
      )
      loadCustomers()
    } catch (error: any) {
      toast.error(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span>Error al eliminar cliente: {error.message}</span>
        </div>,
        {
          duration: 5000,
        }
      )
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      instagram_username: '',
      birthday: '',
      points: 0,
      notes: '',
      tags: []
    })
    setEditingCustomer(null)
    setIsAddModalOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'vip': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isCustomerVip = (customer: Customer) => {
    return customer.tags && customer.tags.includes('VIP')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    // Para fechas de cumpleaños que son solo YYYY-MM-DD, agregar hora local para evitar cambio de zona horaria
    const [year, month, day] = dateString.split('T')[0].split('-')
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return localDate.toLocaleDateString('es-ES')
  }

  const formatPhone = (phone: string) => {
    // Format phone number for better display
    return phone.replace(/(\+54\s?9\s?)(\d{3})(\d{3})(\d{4})/, '$1$2 $3-$4')
  }

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            Administra tu base de clientes y su información de contacto
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="animate-scale-hover" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Agregar Cliente</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="w-[95vw] max-w-lg mx-auto animate-slide-up max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingCustomer ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingCustomer 
                  ? 'Modifica la información del cliente' 
                  : 'Completa la información del nuevo cliente'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Juan Pérez"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+54 9 XXX XXX-XXXX"
                    className="w-full"
                    required
                  />
                </div>
              </div>

              {/* Email e Instagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="juan@email.com"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-sm font-medium">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram_username}
                    onChange={(e) => setFormData({...formData, instagram_username: e.target.value})}
                    placeholder="@juanperez"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Cumpleaños y Puntos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="text-sm font-medium">Fecha de Nacimiento</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points" className="text-sm font-medium">Puntos</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Información adicional sobre el cliente..."
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
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
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{customers.length}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customers.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {customers.filter(c => isCustomerVip(c)).length}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Puntos</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Todos los clientes registrados en tu sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>VIP</TableHead>
                    <TableHead>Cumpleaños</TableHead>
                    <TableHead>Última Interacción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{customer.name || 'Sin nombre'}</p>
                          {customer.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-48">
                              {customer.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {formatPhone(customer.phone)}
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.instagram_username && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Instagram className="h-3 w-3" />
                              {customer.instagram_username}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {customer.points.toLocaleString()}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        {isCustomerVip(customer) ? (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            ⭐ VIP
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(customer.birthday)}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.last_interaction)}
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getStatusColor(customer.status)}>
                          {customer.status === 'active' ? 'Activo' : 
                           customer.status === 'vip' ? 'VIP' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(customer)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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