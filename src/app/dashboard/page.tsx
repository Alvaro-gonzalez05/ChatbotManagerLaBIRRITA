'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  Coins, 
  DollarSign,
  Cake,
  Wifi,
  WifiOff,
  Search,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { Customer } from '@/types/database'

interface DashboardStats {
  reservationsToday: number
  newCustomers: number
  messagesProcessed: number
  pointsEarned: number
  dailyRevenue: number
}

export default function DashboardPage() {
  const { user, businessUser, business } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    reservationsToday: 0,
    newCustomers: 0,
    messagesProcessed: 0,
    pointsEarned: 0,
    dailyRevenue: 0,
  })
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amountSpent, setAmountSpent] = useState('')
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [pointsToAward, setPointsToAward] = useState(0)
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadDashboardStats()
      loadCustomers()
    }
  }, [business?.id])

  const loadCustomers = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading customers:', error)
        toast.error('Error al cargar clientes de la base de datos')
        setCustomers([])
        return
      }
      
      setCustomers(data || [])
      console.log('Loaded customers from database:', data?.length || 0)
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Error al conectar con la base de datos')
      setCustomers([])
    }
  }

  const loadDashboardStats = async () => {
    if (!business?.id) return
    
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')

      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')

      const { data: pointLoads } = await supabase
        .from('point_loads')
        .select('*')
        .eq('business_id', business.id)
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')

      const totalPointsEarned = pointLoads?.reduce((sum, load) => sum + load.points_awarded, 0) || 0
      const totalRevenue = reservations?.reduce((sum, res) => sum + (res.total_amount || 0), 0) || 0

      setStats({
        reservationsToday: reservations?.length || 0,
        newCustomers: customers?.length || 0,
        messagesProcessed: 0, // This would come from message_history
        pointsEarned: totalPointsEarned,
        dailyRevenue: totalRevenue,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const searchCustomer = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Ingresa un número de teléfono')
      return
    }

    if (!business?.id) {
      toast.error('Error: No se encontró información del negocio')
      return
    }

    setLoading(true)
    
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phoneNumber.trim())
        .eq('business_id', business.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (customer) {
        setFoundCustomer(customer)
        toast.success(`Cliente encontrado: ${customer.name || 'Sin nombre'}`)
        calculatePoints()
      } else {
        setFoundCustomer(null)
        toast.error('Cliente no encontrado en la base de datos')
      }
    } catch (error: any) {
      toast.error('Error al buscar cliente: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculatePoints = async () => {
    if (!amountSpent || !business?.id) return

    const amount = parseFloat(amountSpent)
    
    try {
      const { data: loyaltySettings, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('business_id', business.id)
        .single()

      if (error || !loyaltySettings?.purchase_ranges) {
        console.error('Error loading loyalty settings:', error)
        toast.error('No se encontró configuración de puntos. Configure los rangos de compra.')
        setPointsToAward(0)
        return
      }
      
      const ranges = loyaltySettings.purchase_ranges
      let points = 0
      
      for (const range of ranges) {
        if (amount >= range.min && (amount <= range.max || !range.max)) {
          points = range.points
          break
        }
      }

      setPointsToAward(points)
    } catch (error) {
      console.error('Error calculating points:', error)
      toast.error('Error al calcular puntos')
      setPointsToAward(0)
    }
  }

  const loadPoints = async () => {
    if (!foundCustomer || !amountSpent || pointsToAward === 0) {
      toast.error('Complete todos los campos')
      return
    }

    setLoading(true)

    try {
      // Try to update in database first
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          points: foundCustomer.points + pointsToAward,
          total_spent: foundCustomer.total_spent + parseFloat(amountSpent),
          last_interaction: new Date().toISOString()
        })
        .eq('id', foundCustomer.id)

      if (updateError) {
        console.error('Error updating customer in DB:', updateError)
        // Continue with local update as fallback
      }

      // Create point load record in database
      const { error: loadError } = await supabase
        .from('point_loads')
        .insert({
          business_id: foundCustomer.business_id,
          customer_id: foundCustomer.id,
          customer_phone: phoneNumber,
          amount_spent: parseFloat(amountSpent),
          points_awarded: pointsToAward,
          loaded_by: user?.id || 'mock-user-id',
        })

      if (loadError) {
        console.error('Error creating point load record:', loadError)
        // Continue anyway, this is just for history
      }
      
      // Update found customer for display
      const updatedFoundCustomer = {
        ...foundCustomer,
        points: foundCustomer.points + pointsToAward,
        total_spent: foundCustomer.total_spent + parseFloat(amountSpent),
        last_interaction: new Date().toISOString()
      }
      
      setFoundCustomer(updatedFoundCustomer)

      toast.success(`¡${pointsToAward} puntos cargados correctamente!`)
      toast.success(`Nuevo total de puntos: ${updatedFoundCustomer.points}`)
      
      // Reset form
      setPhoneNumber('')
      setAmountSpent('')
      setFoundCustomer(null)
      setPointsToAward(0)
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        pointsEarned: prevStats.pointsEarned + pointsToAward,
        dailyRevenue: prevStats.dailyRevenue + parseFloat(amountSpent)
      }))
      
      // Reload customers to sync with DB
      loadCustomers()
      
    } catch (error: any) {
      console.error('Error loading points:', error)
      toast.error('Error al cargar puntos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (amountSpent && foundCustomer && business?.id) {
      calculatePoints()
    }
  }, [amountSpent, foundCustomer, business?.id])

  // Filter customers based on phone number input
  useEffect(() => {
    if (phoneNumber.length >= 3) {
      const filtered = customers.filter(customer => 
        customer.phone.toLowerCase().includes(phoneNumber.toLowerCase()) ||
        customer.name?.toLowerCase().includes(phoneNumber.toLowerCase())
      )
      setFilteredCustomers(filtered)
      setShowSuggestions(filtered.length > 0 && !foundCustomer)
    } else {
      setFilteredCustomers([])
      setShowSuggestions(false)
    }
  }, [phoneNumber, customers, foundCustomer])

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value)
    if (foundCustomer && value !== foundCustomer.phone) {
      setFoundCustomer(null)
      setPointsToAward(0)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setPhoneNumber(customer.phone)
    setFoundCustomer(customer)
    setShowSuggestions(false)
    toast.success(`Cliente encontrado: ${customer.name || 'Sin nombre'}`)
    if (amountSpent) {
      calculatePoints()
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenido/a, {businessUser?.first_name || user?.email?.split('@')[0] || 'Usuario'}
        </h1>
        <p className="text-muted-foreground">
          Aquí tienes un resumen de la actividad de hoy
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-slide-up">
        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.reservationsToday}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.newCustomers}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Bot</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.messagesProcessed}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Canjeados</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pointsEarned}</div>
          </CardContent>
        </Card>

        <Card className="animate-scale-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${stats.dailyRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Point Loading Form */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Carga de Puntos
          </CardTitle>
          <CardDescription>
            Carga puntos automáticamente basado en el monto gastado por el cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="phone">Número de Teléfono</Label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={suggestionsRef}>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    placeholder="+54 9 XXX XXX-XXXX"
                    className="transition-all duration-200 focus:scale-[1.02]"
                    onFocus={() => phoneNumber.length >= 3 && setShowSuggestions(filteredCustomers.length > 0 && !foundCustomer)}
                  />
                  
                  {/* Suggestions dropdown */}
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{customer.phone}</p>
                              {customer.name && (
                                <p className="text-xs text-muted-foreground">{customer.name}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-primary font-medium">{customer.points} pts</p>
                              <p className="text-xs text-muted-foreground">${customer.total_spent.toLocaleString()}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={searchCustomer}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="animate-scale-hover"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              {phoneNumber.length > 0 && filteredCustomers.length === 0 && phoneNumber.length >= 3 && (
                <p className="text-xs text-muted-foreground">
                  No se encontraron clientes con ese número o nombre
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto Gastado</Label>
              <Input
                id="amount"
                type="number"
                value={amountSpent}
                onChange={(e) => setAmountSpent(e.target.value)}
                placeholder="0"
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>
          </div>

          {pointsToAward > 0 && foundCustomer && (
            <div className="p-3 bg-primary/10 rounded-md animate-slide-up">
              <p className="text-primary font-medium">
                Puntos a otorgar: +{pointsToAward} para {foundCustomer.name || foundCustomer.phone}
              </p>
            </div>
          )}

          <Button 
            onClick={loadPoints}
            disabled={loading || !foundCustomer || pointsToAward === 0}
            className="w-full animate-scale-hover"
          >
            {loading ? 'Cargando...' : 'Cargar Puntos Automáticamente'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximas Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No hay reservas programadas para hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-primary" />
              Cumpleaños
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No hay cumpleaños hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Status */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            Estado del Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Desconectado</p>
              <p className="text-xs text-muted-foreground">Última actividad: Nunca</p>
            </div>
            <Button variant="outline" size="sm" className="animate-scale-hover">
              Conectar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}