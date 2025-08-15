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
        points: formData.points,
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
        const { error } = await supabase
          .from('customers')
          .insert(customerData)
        
        if (error) throw error
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
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)
      
      if (error) throw error
      
      toast.success('Cliente eliminado correctamente')
      loadCustomers()
    } catch (error: any) {
      toast.error('Error al eliminar cliente: ' + error.message)
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-ES')
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
              Agregar Cliente
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-lg animate-slide-up">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer 
                  ? 'Modifica la información del cliente' 
                  : 'Completa la información del nuevo cliente'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+54 9 XXX XXX-XXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="juan@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram_username}
                    onChange={(e) => setFormData({...formData, instagram_username: e.target.value})}
                    placeholder="@juanperez"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Fecha de Nacimiento</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Puntos</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Información adicional sobre el cliente..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
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
              {customers.filter(c => c.status === 'vip').length}
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