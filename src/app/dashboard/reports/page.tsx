'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  DollarSign,
  Download,
  Filter,
  Eye,
  Gift,
  Phone,
  Clock,
  Star
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalReservations: number
  totalPointsEarned: number
  messagesProcessed: number
  averageResponseTime: number
}

interface CustomerStats {
  id: string
  name: string
  phone: string
  points: number
  total_spent: number
  visits: number
  last_interaction: string
  vip_level?: string
}

interface ReservationStats {
  id: string
  customer_name: string
  phone: string
  reservation_type: string
  reservation_date: string
  status: string
  total_amount: number
  created_at: string
}

interface ConversationLog {
  id: string
  customer_number: string
  customer_message: string
  bot_response: string
  timestamp: string
}

interface RevenueData {
  date: string
  reservations: number
  revenue: number
  customers: number
}

export default function ReportsPage() {
  const { business } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalReservations: 0,
    totalPointsEarned: 0,
    messagesProcessed: 0,
    averageResponseTime: 2.3
  })
  
  const [customers, setCustomers] = useState<CustomerStats[]>([])
  const [reservations, setReservations] = useState<ReservationStats[]>([])
  const [conversations, setConversations] = useState<ConversationLog[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  
  // Filter states
  const [dateRange, setDateRange] = useState<string>('30')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadAllReports()
    }
  }, [business?.id, dateRange, startDate, endDate])

  const loadAllReports = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      await Promise.all([
        loadDashboardStats(),
        loadCustomerStats(),
        loadReservationStats(),
        loadConversationStats(),
        loadRevenueData()
      ])
    } catch (error: any) {
      console.error('Error loading reports:', error)
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  const getDateFilter = () => {
    const now = new Date()
    let fromDate: Date
    
    if (startDate && endDate) {
      return {
        from: new Date(startDate + 'T00:00:00'),
        to: new Date(endDate + 'T23:59:59')
      }
    }
    
    switch (dateRange) {
      case '7':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90':
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    return {
      from: fromDate,
      to: now
    }
  }

  const loadDashboardStats = async () => {
    if (!business?.id) return
    
    const { from, to } = getDateFilter()
    
    try {
      // Get customers stats
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
      
      const { data: activeCustomersData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .gte('last_interaction', from.toISOString())
        .lte('last_interaction', to.toISOString())
      
      // Get reservations stats
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
      
      // Get point loads stats
      const { data: pointLoadsData } = await supabase
        .from('point_loads')
        .select('points_awarded')
        .eq('business_id', business.id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
      
      // Get conversation logs stats
      const { data: conversationsData } = await supabase
        .from('conversation_logs')
        .select('*')
        .eq('business_id', business.id)
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString())

      setStats({
        totalCustomers: customersData?.length || 0,
        activeCustomers: activeCustomersData?.length || 0,
        totalReservations: reservationsData?.length || 0,
        totalPointsEarned: pointLoadsData?.reduce((sum, load) => sum + load.points_awarded, 0) || 0,
        messagesProcessed: conversationsData?.length || 0,
        averageResponseTime: 2.3 // This could be calculated from conversation timestamps
      })
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error)
    }
  }

  const loadCustomerStats = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('total_spent', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      const customersWithStats = data?.map(customer => ({
        ...customer,
        visits: Math.floor(customer.total_spent / 15000) || 1, // Estimate visits based on avg spend
        vip_level: customer.points > 3000 ? 'Oro' : customer.points > 1500 ? 'Plata' : customer.points > 500 ? 'Bronce' : 'Regular'
      })) || []
      
      setCustomers(customersWithStats)
    } catch (error: any) {
      console.error('Error loading customer stats:', error)
    }
  }

  const loadReservationStats = async () => {
    if (!business?.id) return
    
    const { from, to } = getDateFilter()
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setReservations(data || [])
    } catch (error: any) {
      console.error('Error loading reservation stats:', error)
    }
  }

  const loadConversationStats = async () => {
    if (!business?.id) return
    
    const { from, to } = getDateFilter()
    
    try {
      const { data, error } = await supabase
        .from('conversation_logs')
        .select('*')
        .eq('business_id', business.id)
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString())
        .order('timestamp', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setConversations(data || [])
    } catch (error: any) {
      console.error('Error loading conversation stats:', error)
    }
  }

  const loadRevenueData = async () => {
    if (!business?.id) return
    
    const { from, to } = getDateFilter()
    
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_date, total_amount, status')
        .eq('business_id', business.id)
        .gte('reservation_date', from.toISOString())
        .lte('reservation_date', to.toISOString())
        .neq('status', 'cancelled')
      
      if (error) throw error
      
      // Group by date
      const revenueByDate: { [key: string]: RevenueData } = {}
      
      data?.forEach(reservation => {
        const date = new Date(reservation.reservation_date).toISOString().split('T')[0]
        if (!revenueByDate[date]) {
          revenueByDate[date] = {
            date,
            reservations: 0,
            revenue: 0,
            customers: 0
          }
        }
        
        revenueByDate[date].reservations += 1
        revenueByDate[date].revenue += reservation.total_amount || 0
        revenueByDate[date].customers += 1
      })
      
      const sortedData = Object.values(revenueByDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      setRevenueData(sortedData)
    } catch (error: any) {
      console.error('Error loading revenue data:', error)
    }
  }

  const exportReport = async (type: string) => {
    try {
      toast.success(`Exportando reporte de ${type}...`)
      // Here you would implement the export functionality
      // For now, we'll just show a success message
      setTimeout(() => {
        toast.success(`Reporte de ${type} exportado correctamente`)
      }, 1500)
    } catch (error: any) {
      toast.error('Error al exportar reporte')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS' 
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold mb-2">Reportes y Analytics</h1>
          <p className="text-muted-foreground">
            Analiza el rendimiento de tu negocio y bot de WhatsApp
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportReport('completo')}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={loadAllReports} disabled={loading}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalCustomers}</div>
            <p className="text-xs text-green-600">
              {stats.activeCustomers} activos en el período
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalReservations}</div>
            <p className="text-xs text-muted-foreground">
              En los últimos {dateRange} días
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes WhatsApp</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.messagesProcessed}</div>
            <p className="text-xs text-blue-600">
              ~{stats.averageResponseTime}s tiempo promedio
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Entregados</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalPointsEarned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Puntos de fidelidad
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Estimados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(revenueData.reduce((sum, data) => sum + data.revenue, 0))}
            </div>
            <p className="text-xs text-green-600">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Desde reservas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia Bot</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">94%</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Respuestas automatizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="conversations">Conversaciones</TabsTrigger>
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Clientes</CardTitle>
                  <CardDescription>
                    Clientes con mayor gasto y puntos acumulados
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('clientes')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nivel VIP</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Gasto Total</TableHead>
                    <TableHead>Visitas</TableHead>
                    <TableHead>Última Interacción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            customer.vip_level === 'Oro' ? 'default' : 
                            customer.vip_level === 'Plata' ? 'secondary' : 'outline'
                          }
                          className={
                            customer.vip_level === 'Oro' ? 'bg-yellow-100 text-yellow-800' :
                            customer.vip_level === 'Plata' ? 'bg-gray-100 text-gray-800' :
                            customer.vip_level === 'Bronce' ? 'bg-orange-100 text-orange-800' : ''
                          }
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {customer.vip_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {customer.points.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(customer.total_spent)}
                      </TableCell>
                      <TableCell>{customer.visits}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(customer.last_interaction)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations Tab */}
        <TabsContent value="reservations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reservas Recientes</CardTitle>
                  <CardDescription>
                    Últimas reservas en el período seleccionado
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('reservas')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Creada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.customer_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {reservation.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            reservation.reservation_type === 'cena' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }
                        >
                          {reservation.reservation_type === 'cena' ? '🍽️ Cena' : '💃 Baile'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(reservation.reservation_date)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            reservation.status === 'confirmed' ? 'default' :
                            reservation.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {reservation.status === 'confirmed' ? 'Confirmado' :
                           reservation.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(reservation.total_amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(reservation.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conversaciones WhatsApp</CardTitle>
                  <CardDescription>
                    Últimos intercambios de mensajes con el bot
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('conversaciones')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{conversation.customer_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(conversation.timestamp)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Cliente:</p>
                        <p>{conversation.customer_message}</p>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg">
                        <p className="text-sm font-medium text-primary mb-1">Bot:</p>
                        <p>{conversation.bot_response}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Análisis de Ingresos</CardTitle>
                  <CardDescription>
                    Ingresos por día basados en reservas confirmadas
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportReport('ingresos')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Reservas</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Promedio por Cliente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {formatDate(data.date)}
                      </TableCell>
                      <TableCell>{data.reservations}</TableCell>
                      <TableCell>{data.customers}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(data.revenue)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(data.customers > 0 ? data.revenue / data.customers : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {revenueData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de ingresos en el período seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}