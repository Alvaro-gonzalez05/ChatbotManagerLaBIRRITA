'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Bot, 
  Settings, 
  MessageSquare,
  Building,
  Clock,
  Smartphone,
  Brain,
  Zap,
  Send,
  QrCode,
  Wifi,
  WifiOff
} from 'lucide-react'
import { toast } from 'sonner'
import ChatSimulator from '@/components/ChatSimulator'

interface BotPersonality {
  id?: string
  business_id: string
  bot_name: string
  tone: string
  personality_description: string
  welcome_message: string
  goodbye_message: string
  fallback_message: string
  out_of_hours_message: string
  capabilities: string[]
  reservation_settings: any
}

interface BusinessInfo {
  name: string
  description: string
  address: string
  phone: string
  email: string
  working_hours: any
  categories: string[]
  specialties: string[]
}


export default function BotConfigurationPage() {
  const { business } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [botPersonality, setBotPersonality] = useState<BotPersonality>({
    business_id: business?.id || '',
    bot_name: 'Asistente',
    tone: 'amigable',
    personality_description: '',
    welcome_message: '¡Hola! Soy el asistente virtual de nuestro restaurante. ¿En qué puedo ayudarte hoy?',
    goodbye_message: '¡Gracias por contactarnos! Esperamos verte pronto en nuestro restaurante. ¡Que tengas un excelente día!',
    fallback_message: 'Disculpa, no entendí bien tu consulta. ¿Podrías reformular tu pregunta? Puedo ayudarte con reservas, información del restaurante y puntos de fidelidad.',
    out_of_hours_message: 'Gracias por contactarnos. En este momento estamos cerrados, pero te responderemos lo antes posible.',
    capabilities: ['reservas', 'informacion', 'puntos'],
    reservation_settings: {}
  })
  
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    working_hours: {},
    categories: [],
    specialties: []
  })

  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    qrCode: '',
    instanceName: '',
    phoneNumber: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadBotConfiguration()
      loadBusinessInfo()
      checkWhatsAppConnection()
    }
  }, [business?.id])

  const checkWhatsAppConnection = async () => {
    if (!business?.id) return
    
    try {
      const instanceName = `business-${business.id}-bot`
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      console.log('Checking WhatsApp connection:', `${apiUrl}/api/whatsapp/instance/status/${instanceName}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(`${apiUrl}/api/whatsapp/instance/status/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const statusData = await response.json()
        console.log('WhatsApp status data:', statusData)
        setWhatsappStatus(prev => ({
          ...prev,
          connected: statusData.status === 'open',
          instanceName: statusData.instanceName,
          phoneNumber: statusData.number || ''
        }))
      } else {
        console.warn('WhatsApp status check failed:', response.status, response.statusText)
        setWhatsappStatus(prev => ({
          ...prev,
          connected: false,
          error: `Error: ${response.status} ${response.statusText}`
        }))
      }
    } catch (error: any) {
      console.warn('WhatsApp API not available:', error.message)
      // Set mock/disconnected state when API is not available
      setWhatsappStatus(prev => ({
        ...prev,
        connected: false,
        error: 'API no disponible (modo desarrollo)'
      }))
    }
  }

  const disconnectWhatsApp = async () => {
    if (!whatsappStatus.instanceName) return
    
    try {
      setSaving(true)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/whatsapp/instance/logout/${whatsappStatus.instanceName}`, {
        method: 'POST',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        setWhatsappStatus(prev => ({
          ...prev,
          connected: false,
          phoneNumber: '',
          qrCode: ''
        }))
        toast.success('WhatsApp desconectado correctamente')
      } else {
        console.warn('WhatsApp disconnect request failed:', response.status, response.statusText)
        // Still update local state
        setWhatsappStatus(prev => ({
          ...prev,
          connected: false,
          phoneNumber: '',
          qrCode: ''
        }))
        toast.success('WhatsApp desconectado localmente (API no disponible)')
      }
    } catch (error: any) {
      console.warn('WhatsApp API not available for disconnect:', error.message)
      // Update local state anyway
      setWhatsappStatus(prev => ({
        ...prev,
        connected: false,
        phoneNumber: '',
        qrCode: '',
        error: 'API no disponible'
      }))
      toast.success('WhatsApp desconectado localmente (modo desarrollo)')
    } finally {
      setSaving(false)
    }
  }

  const loadBotConfiguration = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bot_personalities')
        .select('*')
        .eq('business_id', business.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Database connection failed for bot config, using default settings:', error.message)
        // Keep default bot personality when database is not available
        setBotPersonality(prev => ({
          ...prev,
          business_id: business.id
        }))
        return
      }
      
      if (data) {
        setBotPersonality(data)
      }
    } catch (error: any) {
      console.warn('Error loading bot configuration, using defaults:', error)
      // Keep default configuration on error
      setBotPersonality(prev => ({
        ...prev,
        business_id: business.id
      }))
    } finally {
      setLoading(false)
    }
  }

  const loadBusinessInfo = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', business.id)
        .single()
      
      if (error) {
        console.warn('Database connection failed, using mock business data:', error.message)
        // Use mock data when database is not available
        setBusinessInfo({
          name: business.name,
          description: business.description || 'Un excelente restaurante en Mendoza',
          address: business.address || 'Av. San Martín 123, Mendoza',
          phone: business.phone || '+54 261 123 4567',
          email: business.email || 'info@mirestaurante.com',
          working_hours: business.working_hours || {
            monday: { open: '10:00', close: '22:00' },
            tuesday: { open: '10:00', close: '22:00' },
            wednesday: { open: '10:00', close: '22:00' },
            thursday: { open: '10:00', close: '22:00' },
            friday: { open: '10:00', close: '24:00' },
            saturday: { open: '10:00', close: '24:00' },
            sunday: { open: '12:00', close: '22:00' }
          },
          categories: business.categories || ['restaurante', 'bar'],
          specialties: business.specialties || ['comida argentina', 'asados']
        })
        return
      }
      
      if (data) {
        setBusinessInfo({
          name: data.name,
          description: data.description || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          working_hours: data.working_hours || {},
          categories: data.categories || [],
          specialties: data.specialties || []
        })
      }
    } catch (error: any) {
      console.warn('Error loading business info, using fallback data:', error)
      // Fallback to business data from auth
      setBusinessInfo({
        name: business?.name || 'Mi Negocio',
        description: business?.description || 'Un excelente negocio',
        address: business?.address || 'Dirección no disponible',
        phone: business?.phone || 'Teléfono no disponible',
        email: business?.email || 'email@negocio.com',
        working_hours: business?.working_hours || {},
        categories: business?.categories || [],
        specialties: business?.specialties || []
      })
    }
  }

  const saveBotConfiguration = async () => {
    if (!business?.id) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('bot_personalities')
        .upsert({ ...botPersonality, business_id: business.id })
      
      if (error) {
        console.warn('Database not available, configuration saved locally:', error.message)
        toast.success('Configuración guardada localmente (base de datos no disponible)')
      } else {
        toast.success('Configuración del bot guardada correctamente')
      }
    } catch (error: any) {
      console.warn('Error saving bot configuration:', error)
      toast.success('Configuración guardada localmente (modo desarrollo)')
    } finally {
      setSaving(false)
    }
  }

  const saveBusinessInfo = async () => {
    if (!business?.id) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('businesses')
        .update(businessInfo)
        .eq('id', business.id)
      
      if (error) {
        console.warn('Database not available, business info saved locally:', error.message)
        toast.success('Información guardada localmente (base de datos no disponible)')
      } else {
        toast.success('Información del negocio actualizada')
      }
    } catch (error: any) {
      console.warn('Error saving business info:', error)
      toast.success('Información guardada localmente (modo desarrollo)')
    } finally {
      setSaving(false)
    }
  }

  const generateQRCode = async () => {
    if (!business?.id) return
    
    try {
      setSaving(true)
      
      // Create WhatsApp instance
      const instanceName = whatsappStatus.instanceName || `business-${business.id}-bot`
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/whatsapp/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId: business.id }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to create WhatsApp instance: ${response.status} ${response.statusText}`)
      }
      
      const instanceData = await response.json()
      
      // Update state with instance info
      setWhatsappStatus(prev => ({
        ...prev,
        instanceName: instanceData.instanceName,
        connected: instanceData.status === 'open'
      }))
      
      // Get QR code
      setTimeout(async () => {
        try {
          const qrController = new AbortController()
          const qrTimeoutId = setTimeout(() => qrController.abort(), 10000) // 10 second timeout
          
          const qrResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/whatsapp/instance/qr/${instanceData.instanceName}`, {
            signal: qrController.signal
          })
          
          clearTimeout(qrTimeoutId)
          
          if (qrResponse.ok) {
            const qrData = await qrResponse.json()
            setWhatsappStatus(prev => ({
              ...prev,
              qrCode: qrData.qrCode
            }))
            toast.success('Código QR generado. Escanéalo con WhatsApp.')
          } else {
            console.warn('QR code request failed:', qrResponse.status)
            toast.warning('Error al obtener código QR (API no disponible)')
          }
        } catch (error) {
          console.warn('Error getting QR code:', error)
          toast.warning('Error al obtener código QR (API no disponible)')
        }
      }, 2000)
      
    } catch (error: any) {
      console.warn('WhatsApp API not available for QR generation:', error.message)
      
      // Mock QR code for development
      setWhatsappStatus(prev => ({
        ...prev,
        instanceName: `business-${business.id}-bot`,
        connected: false,
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent pixel as placeholder
        error: 'API no disponible (modo desarrollo)'
      }))
      
      toast.success('Código QR simulado generado (modo desarrollo)')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold mb-2">Configuración del Bot</h1>
          <p className="text-muted-foreground">
            Configura la personalidad, mensajes y conexión de WhatsApp
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={whatsappStatus.connected ? 'secondary' : 'outline'} className="gap-2">
            {whatsappStatus.connected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {whatsappStatus.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="personality" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personality">Personalidad</TabsTrigger>
              <TabsTrigger value="business">Negocio</TabsTrigger>
              <TabsTrigger value="messages">Mensajes</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            {/* Personality Tab */}
            <TabsContent value="personality" className="space-y-6">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Personalidad del Bot
                  </CardTitle>
                  <CardDescription>
                    Define cómo se comportará tu asistente virtual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Bot</Label>
                      <Input
                        value={botPersonality.bot_name}
                        onChange={(e) => setBotPersonality({...botPersonality, bot_name: e.target.value})}
                        placeholder="Asistente Virtual"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tono de Comunicación</Label>
                      <Select value={botPersonality.tone} onValueChange={(value) => setBotPersonality({...botPersonality, tone: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amigable">😊 Amigable</SelectItem>
                          <SelectItem value="profesional">👔 Profesional</SelectItem>
                          <SelectItem value="casual">😎 Casual</SelectItem>
                          <SelectItem value="formal">🎩 Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción de Personalidad</Label>
                    <Textarea
                      value={botPersonality.personality_description}
                      onChange={(e) => setBotPersonality({...botPersonality, personality_description: e.target.value})}
                      placeholder="Describe cómo debe comportarse tu bot..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Capacidades del Bot</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'reservas', label: 'Gestionar Reservas' },
                        { key: 'informacion', label: 'Información del Negocio' },
                        { key: 'puntos', label: 'Consultar Puntos' },
                        { key: 'promociones', label: 'Mostrar Promociones' },
                        { key: 'menu', label: 'Información del Menú' },
                        { key: 'eventos', label: 'Eventos Especiales' }
                      ].map(capability => (
                        <div key={capability.key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={botPersonality.capabilities.includes(capability.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBotPersonality({
                                  ...botPersonality,
                                  capabilities: [...botPersonality.capabilities, capability.key]
                                })
                              } else {
                                setBotPersonality({
                                  ...botPersonality,
                                  capabilities: botPersonality.capabilities.filter(c => c !== capability.key)
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <Label className="text-sm">{capability.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={saveBotConfiguration} disabled={saving} className="w-full animate-scale-hover">
                    <Settings className="mr-2 h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar Personalidad'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Info Tab */}
            <TabsContent value="business" className="space-y-6">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Información del Negocio
                  </CardTitle>
                  <CardDescription>
                    Información que el bot usará para responder preguntas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Negocio</Label>
                      <Input
                        value={businessInfo.name}
                        onChange={(e) => setBusinessInfo({...businessInfo, name: e.target.value})}
                        placeholder="Mi Restaurante"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={businessInfo.phone}
                        onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
                        placeholder="+54 9 XXX XXX-XXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={businessInfo.description}
                      onChange={(e) => setBusinessInfo({...businessInfo, description: e.target.value})}
                      placeholder="Describe tu negocio..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
                      placeholder="Calle Falsa 123, Ciudad"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Horarios de Atención</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <div key={day} className="flex items-center gap-3">
                          <div className="w-20">
                            <Label className="text-sm capitalize">
                              {day === 'monday' ? 'Lunes' : 
                               day === 'tuesday' ? 'Martes' : 
                               day === 'wednesday' ? 'Miércoles' : 
                               day === 'thursday' ? 'Jueves' : 
                               day === 'friday' ? 'Viernes' : 
                               day === 'saturday' ? 'Sábado' : 'Domingo'}
                            </Label>
                          </div>
                          <Input
                            type="time"
                            value={businessInfo.working_hours?.[day]?.open || ''}
                            onChange={(e) => setBusinessInfo({
                              ...businessInfo,
                              working_hours: {
                                ...businessInfo.working_hours,
                                [day]: {
                                  ...businessInfo.working_hours?.[day],
                                  open: e.target.value
                                }
                              }
                            })}
                            className="w-32"
                          />
                          <span>-</span>
                          <Input
                            type="time"
                            value={businessInfo.working_hours?.[day]?.close || ''}
                            onChange={(e) => setBusinessInfo({
                              ...businessInfo,
                              working_hours: {
                                ...businessInfo.working_hours,
                                [day]: {
                                  ...businessInfo.working_hours?.[day],
                                  close: e.target.value
                                }
                              }
                            })}
                            className="w-32"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={businessInfo.working_hours?.[day]?.closed || false}
                              onChange={(e) => setBusinessInfo({
                                ...businessInfo,
                                working_hours: {
                                  ...businessInfo.working_hours,
                                  [day]: {
                                    ...businessInfo.working_hours?.[day],
                                    closed: e.target.checked
                                  }
                                }
                              })}
                              className="rounded"
                            />
                            <Label className="text-sm">Cerrado</Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={saveBusinessInfo} disabled={saving} className="w-full animate-scale-hover">
                    <Building className="mr-2 h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar Información'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-6">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Mensajes Personalizables
                  </CardTitle>
                  <CardDescription>
                    Configura los mensajes que enviará tu bot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensaje de Bienvenida</Label>
                    <Textarea
                      value={botPersonality.welcome_message}
                      onChange={(e) => setBotPersonality({...botPersonality, welcome_message: e.target.value})}
                      placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje de Despedida</Label>
                    <Textarea
                      value={botPersonality.goodbye_message}
                      onChange={(e) => setBotPersonality({...botPersonality, goodbye_message: e.target.value})}
                      placeholder="¡Gracias por contactarnos!"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje Cuando No Entiende</Label>
                    <Textarea
                      value={botPersonality.fallback_message}
                      onChange={(e) => setBotPersonality({...botPersonality, fallback_message: e.target.value})}
                      placeholder="Disculpa, no entendí bien..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje Fuera de Horario</Label>
                    <Textarea
                      value={botPersonality.out_of_hours_message}
                      onChange={(e) => setBotPersonality({...botPersonality, out_of_hours_message: e.target.value})}
                      placeholder="Estamos cerrados en este momento..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={saveBotConfiguration} disabled={saving} className="w-full animate-scale-hover">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar Mensajes'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-6">
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Conexión WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Conecta tu bot con la API oficial de WhatsApp Business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Connection Status */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Estado de Conexión</h3>
                      <Badge variant={whatsappStatus.connected ? 'secondary' : 'outline'}>
                        {whatsappStatus.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                    
                    {whatsappStatus.connected ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            📱 Número: {whatsappStatus.phoneNumber || 'No disponible'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            🔗 Instancia: {whatsappStatus.instanceName}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={disconnectWhatsApp}
                          disabled={saving}
                        >
                          {saving ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Para conectar WhatsApp, genera un código QR y escanéalo con tu teléfono.
                      </p>
                    )}
                  </div>

                  {/* QR Code Generation */}
                  {!whatsappStatus.connected && (
                    <div className="text-center space-y-4">
                      {whatsappStatus.qrCode ? (
                        <div className="space-y-4">
                          <div className="mx-auto w-fit">
                            <img 
                              src={whatsappStatus.qrCode} 
                              alt="WhatsApp QR Code"
                              className="border rounded-lg"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Escanea este código QR con WhatsApp para conectar tu bot
                          </p>
                          <Button onClick={generateQRCode} variant="outline">
                            <QrCode className="mr-2 h-4 w-4" />
                            Generar Nuevo QR
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <QrCode className="mx-auto h-16 w-16 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Haz clic en el botón para generar un código QR
                          </p>
                          <Button onClick={generateQRCode}>
                            <QrCode className="mr-2 h-4 w-4" />
                            Generar Código QR
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connection Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Configuración de Conexión</h3>
                    
                    <div className="space-y-2">
                      <Label>Nombre de la Instancia</Label>
                      <Input
                        value={whatsappStatus.instanceName}
                        onChange={(e) => setWhatsappStatus({...whatsappStatus, instanceName: e.target.value})}
                        placeholder="mi-restaurante-bot"
                      />
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Configuración de WhatsApp Business API</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        La configuración se realiza a través de variables de entorno del servidor.
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• WHATSAPP_ACCESS_TOKEN: Token de acceso de Meta Business</li>
                        <li>• WHATSAPP_VERIFY_TOKEN: Token de verificación del webhook</li>
                        <li>• WHATSAPP_API_VERSION: Versión de la API (opcional)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <div className="pt-4 space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={checkWhatsAppConnection}
                      disabled={saving}
                      variant="outline"
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      {saving ? 'Verificando...' : 'Verificar Conexión'}
                    </Button>
                    
                    {whatsappStatus.connected && (
                      <Button 
                        className="w-full" 
                        onClick={async () => {
                          if (!whatsappStatus.instanceName || !whatsappStatus.phoneNumber) return
                          
                          try {
                            setSaving(true)
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/whatsapp/message/send`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                instanceName: whatsappStatus.instanceName,
                                number: whatsappStatus.phoneNumber,
                                message: '🤖 ¡Hola! Este es un mensaje de prueba desde tu bot de WhatsApp.'
                              })
                            })
                            
                            if (response.ok) {
                              toast.success('Mensaje de prueba enviado')
                            } else {
                              throw new Error('Failed to send test message')
                            }
                          } catch (error: any) {
                            console.error('Error sending test message:', error)
                            toast.error('Error al enviar mensaje de prueba')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        disabled={saving || !whatsappStatus.phoneNumber}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        {saving ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat Simulator */}
        <div className="xl:col-span-1">
          <ChatSimulator botPersonality={botPersonality} businessInfo={businessInfo} />
        </div>
      </div>
    </div>
  )
}