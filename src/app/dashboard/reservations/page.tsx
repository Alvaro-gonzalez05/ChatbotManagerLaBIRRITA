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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Edit,
  Trash2,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

interface Reservation {
  id: string
  business_id: string
  customer_id?: string
  customer_name: string
  phone: string
  reservation_type: 'cena' | 'baile'
  reservation_date: string
  party_size: number
  status: 'pending' | 'confirmed' | 'cancelled'
  deposit_amount: number
  deposit_paid: boolean
  deposit_method?: string
  special_requests?: string
  total_amount: number
  created_at: string
  updated_at: string
}

export default function ReservationsPage() {
  const { business } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    reservation_type: 'cena' as 'cena' | 'baile',
    reservation_date: '',
    reservation_time: '',
    party_size: 2,
    deposit_amount: 0,
    deposit_paid: false,
    deposit_method: '',
    special_requests: '',
    total_amount: 0
  })

  const supabase = createClient()

  const reservationTypes = {
    cena: { label: 'Cena', color: 'bg-blue-100 text-blue-800', defaultDeposit: 5000 },
    baile: { label: 'Baile', color: 'bg-purple-100 text-purple-800', defaultDeposit: 3000 }
  }

  const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle }
  }

  useEffect(() => {
    if (business?.id) {
      loadReservations()
    }
  }, [business?.id])

  useEffect(() => {
    applyFilters()
  }, [reservations, filterStatus, filterType, selectedDate])

  const loadReservations = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business.id)
        .order('reservation_date', { ascending: false })
      
      if (error) throw error
      setReservations(data || [])
    } catch (error: any) {
      toast.error('Error al cargar reservas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...reservations]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus)
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.reservation_type === filterType)
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(r => 
        new Date(r.reservation_date).toDateString() === new Date(selectedDate).toDateString()
      )
    }

    setFilteredReservations(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!business?.id || !formData.customer_name || !formData.phone || !formData.reservation_date) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setLoading(true)

    try {
      // Combine date and time
      const reservationDateTime = new Date(`${formData.reservation_date}T${formData.reservation_time || '20:00'}`)
      
      const reservationData = {
        business_id: business.id,
        customer_name: formData.customer_name,
        phone: formData.phone,
        reservation_type: formData.reservation_type,
        reservation_date: reservationDateTime.toISOString(),
        party_size: formData.party_size,
        status: formData.deposit_paid ? 'confirmed' : 'pending',
        deposit_amount: formData.deposit_amount,
        deposit_paid: formData.deposit_paid,
        deposit_method: formData.deposit_method || null,
        special_requests: formData.special_requests || null,
        total_amount: formData.total_amount
      }

      if (editingReservation) {
        // Update existing reservation
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id)
        
        if (error) throw error
        toast.success('Reserva actualizada correctamente')
      } else {
        // Create new reservation
        const { error } = await supabase
          .from('reservations')
          .insert(reservationData)
        
        if (error) throw error
        toast.success('Reserva creada correctamente')
      }

      resetForm()
      loadReservations()
      
    } catch (error: any) {
      toast.error('Error al guardar reserva: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (reservation: Reservation) => {
    const reservationDate = new Date(reservation.reservation_date)
    setEditingReservation(reservation)
    setFormData({
      customer_name: reservation.customer_name,
      phone: reservation.phone,
      reservation_type: reservation.reservation_type,
      reservation_date: reservationDate.toISOString().split('T')[0],
      reservation_time: reservationDate.toTimeString().slice(0, 5),
      party_size: reservation.party_size,
      deposit_amount: reservation.deposit_amount,
      deposit_paid: reservation.deposit_paid,
      deposit_method: reservation.deposit_method || '',
      special_requests: reservation.special_requests || '',
      total_amount: reservation.total_amount
    })
    setIsAddModalOpen(true)
  }

  const handleDelete = async (reservation: Reservation) => {
    // Create elegant confirmation toast with Sonner
    toast(
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              ¿Eliminar reserva?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará permanentemente la reserva de <span className="font-medium">{reservation.customer_name}</span> para el {formatDateTime(reservation.reservation_date).date}. 
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-13">
          <button
            onClick={() => {
              toast.dismiss()
              performDeleteReservation(reservation)
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

  const performDeleteReservation = async (reservation: Reservation) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)
      
      if (error) throw error
      
      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Reserva eliminada correctamente</span>
        </div>,
        {
          duration: 4000,
        }
      )
      loadReservations()
    } catch (error: any) {
      toast.error(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span>Error al eliminar reserva: {error.message}</span>
        </div>,
        {
          duration: 5000,
        }
      )
    }
  }

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: newStatus,
          deposit_paid: newStatus === 'confirmed' ? true : undefined
        })
        .eq('id', reservationId)
      
      if (error) throw error
      
      toast.success('Estado actualizado correctamente')
      loadReservations()
    } catch (error: any) {
      toast.error('Error al actualizar estado: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      phone: '',
      reservation_type: 'cena',
      reservation_date: '',
      reservation_time: '',
      party_size: 2,
      deposit_amount: 0,
      deposit_paid: false,
      deposit_method: '',
      special_requests: '',
      total_amount: 0
    })
    setEditingReservation(null)
    setIsAddModalOpen(false)
  }

  const getTodayReservations = () => {
    const today = new Date().toDateString()
    return reservations.filter(r => new Date(r.reservation_date).toDateString() === today)
  }

  const getPendingReservations = () => {
    return reservations.filter(r => r.status === 'pending')
  }

  const getConfirmedReservations = () => {
    return reservations.filter(r => r.status === 'confirmed')
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS' 
    }).format(amount)
  }

  if (loading && reservations.length === 0) {
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
          <h1 className="text-3xl font-bold mb-2">Dashboard de Reservas</h1>
          <p className="text-muted-foreground">
            Gestiona las reservas para cena y baile de tu restaurante
          </p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="animate-scale-hover" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nueva Reserva</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </DialogTrigger>
          
          <DialogContent className="w-[95vw] max-w-2xl mx-auto animate-slide-up max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingReservation ? 'Editar Reserva' : 'Nueva Reserva'}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingReservation 
                  ? 'Modifica los detalles de la reserva' 
                  : 'Completa la información para la nueva reserva'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del Cliente */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Información del Cliente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name" className="text-sm font-medium">Nombre del Cliente *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
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
              </div>

              {/* Detalles de la Reserva */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Detalles de la Reserva</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reservation_type" className="text-sm font-medium">Tipo de Reserva *</Label>
                    <Select 
                      value={formData.reservation_type} 
                      onValueChange={(value: 'cena' | 'baile') => {
                        setFormData({
                          ...formData, 
                          reservation_type: value,
                          deposit_amount: reservationTypes[value].defaultDeposit
                        })
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cena">🍽️ Cena</SelectItem>
                        <SelectItem value="baile">💃 Baile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="party_size" className="text-sm font-medium">Cantidad de Personas</Label>
                    <Input
                      id="party_size"
                      type="number"
                      value={formData.party_size}
                      onChange={(e) => setFormData({...formData, party_size: parseInt(e.target.value) || 1})}
                      min="1"
                      max="20"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reservation_date" className="text-sm font-medium">Fecha *</Label>
                    <Input
                      id="reservation_date"
                      type="date"
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({...formData, reservation_date: e.target.value})}
                      className="w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reservation_time" className="text-sm font-medium">Hora</Label>
                    <Input
                      id="reservation_time"
                      type="time"
                      value={formData.reservation_time}
                      onChange={(e) => setFormData({...formData, reservation_time: e.target.value})}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Información de Pago */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Información de Pago</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit_amount" className="text-sm font-medium">Monto de Seña</Label>
                    <Input
                      id="deposit_amount"
                      type="number"
                      value={formData.deposit_amount}
                      onChange={(e) => setFormData({...formData, deposit_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_amount" className="text-sm font-medium">Monto Total Estimado</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      id="deposit_paid"
                      type="checkbox"
                      checked={formData.deposit_paid}
                      onChange={(e) => setFormData({...formData, deposit_paid: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="deposit_paid" className="text-sm font-medium">Seña Pagada</Label>
                  </div>

                  {formData.deposit_paid && (
                    <div className="space-y-2">
                      <Label htmlFor="deposit_method" className="text-sm font-medium">Método de Pago</Label>
                      <Select 
                        value={formData.deposit_method} 
                        onValueChange={(value) => setFormData({...formData, deposit_method: value})}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="mercadopago">MercadoPago</SelectItem>
                          <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Solicitudes Especiales */}
              <div className="space-y-2">
                <Label htmlFor="special_requests" className="text-sm font-medium">Solicitudes Especiales</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
                  placeholder="Mesa cerca de la ventana, cumpleaños, etc..."
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Guardando...' : editingReservation ? 'Actualizar' : 'Crear Reserva'}
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
            <CardTitle className="text-sm font-medium">Reservas de Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{getTodayReservations().length}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getPendingReservations().length}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getConfirmedReservations().length}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reservations.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="cena">Cena</SelectItem>
            <SelectItem value="baile">Baile</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40"
        />

        {(filterStatus !== 'all' || filterType !== 'all' || selectedDate) && (
          <Button 
            variant="outline" 
            onClick={() => {
              setFilterStatus('all')
              setFilterType('all')
              setSelectedDate('')
            }}
          >
            Limpiar Filtros
          </Button>
        )}
      </div>

      {/* Reservations Table */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>Lista de Reservas</CardTitle>
          <CardDescription>
            Todas las reservas del restaurante
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay reservas que coincidan con los filtros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Personas</TableHead>
                    <TableHead>Seña</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => {
                    const { date, time } = formatDateTime(reservation.reservation_date)
                    const StatusIcon = statusConfig[reservation.status].icon
                    
                    return (
                      <TableRow key={reservation.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold">{reservation.customer_name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {reservation.phone}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={reservationTypes[reservation.reservation_type].color}>
                            {reservationTypes[reservation.reservation_type].label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {date}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {time}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {reservation.party_size}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-mono">
                              {formatCurrency(reservation.deposit_amount)}
                            </div>
                            {reservation.deposit_paid ? (
                              <Badge variant="secondary" className="text-xs">
                                Pagada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pendiente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={reservation.status}
                              onValueChange={(value) => handleStatusChange(reservation.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className="h-3 w-3" />
                                  <span className="text-xs">{statusConfig[reservation.status].label}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="confirmed">Confirmado</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(reservation)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(reservation)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}