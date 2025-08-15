'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Gift, 
  Plus, 
  Trash2, 
  Edit, 
  Star,
  Calendar,
  Users,
  DollarSign,
  Settings,
  Zap,
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PurchaseRange {
  min: number
  max: number | null
  points: number
}

interface VipLevel {
  name: string
  min_points: number
  benefits: string[]
  color?: string
}

interface SpecialDate {
  id: string
  name: string
  date: string
  points_multiplier: number
  bonus_points: number
}

interface LoyaltySettings {
  id?: string
  business_id: string
  purchase_ranges: PurchaseRange[]
  welcome_points: number
  birthday_bonus_points: number
  referral_points: number
  special_dates: SpecialDate[]
  points_expiry_days: number
  expiry_notification_days: number
  vip_levels: VipLevel[]
}

interface Automation {
  id: string
  name: string
  automation_type: 'birthday' | 'missing_field' | 'inactive_customers' | 'points_notification'
  is_active: boolean
  trigger_days?: number
  message_template: string
  promotion_id?: string
  points_reward?: number
  frequency_type: string
  max_sends_per_customer: number
  missing_field_type?: string
  created_at: string
}

interface Promotion {
  id: string
  title: string
  description: string
  discount_percentage?: number
  discount_amount?: number
  points_required?: number
  points_reward?: number
  promotion_type: string
  flyer_image_url?: string
}

function LoyaltyPageContent() {
  const { business } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Automation form states
  const [showAutomationForm, setShowAutomationForm] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [selectedAutomationType, setSelectedAutomationType] = useState<string>('')

  // Promotion form states
  const [showPromotionForm, setShowPromotionForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  
  // Form states
  const [newRange, setNewRange] = useState<PurchaseRange>({ min: 0, max: null, points: 0 })
  const [newVipLevel, setNewVipLevel] = useState<VipLevel>({ name: '', min_points: 0, benefits: [''] })
  const [newSpecialDate, setNewSpecialDate] = useState<SpecialDate>({ 
    id: '', 
    name: '', 
    date: '', 
    points_multiplier: 1, 
    bonus_points: 0 
  })

  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadLoyaltySettings()
      loadAutomations()
      loadPromotions()
    }
  }, [business?.id])

  const loadLoyaltySettings = async () => {
    if (!business?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('business_id', business.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setLoyaltySettings(data)
      } else {
        // Create default settings if none exist
        const defaultSettings: LoyaltySettings = {
          business_id: business.id,
          purchase_ranges: [
            { min: 0, max: 50000, points: 50 },
            { min: 50001, max: 100000, points: 150 },
            { min: 100001, max: 200000, points: 350 },
            { min: 200001, max: null, points: 500 }
          ],
          welcome_points: 50,
          birthday_bonus_points: 100,
          referral_points: 200,
          special_dates: [],
          points_expiry_days: 365,
          expiry_notification_days: 30,
          vip_levels: [
            { name: 'Bronce', min_points: 500, benefits: ['5% descuento en consumo'], color: '#CD7F32' },
            { name: 'Plata', min_points: 1500, benefits: ['10% descuento', 'Prioridad en reservas'], color: '#C0C0C0' },
            { name: 'Oro', min_points: 3000, benefits: ['15% descuento', 'Bebida gratis', 'Mesa VIP'], color: '#FFD700' }
          ]
        }
        setLoyaltySettings(defaultSettings)
      }
    } catch (error: any) {
      toast.error('Error al cargar configuración: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAutomations = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAutomations(data || [])
    } catch (error: any) {
      toast.error('Error al cargar automatizaciones: ' + error.message)
    }
  }

  const loadPromotions = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, flyer_image_data, flyer_image_type, flyer_image_size')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Convert binary image data to base64 URLs for display
      const promotionsWithImages = await Promise.all((data || []).map(async (promotion) => {
        if (promotion.flyer_image_data && promotion.flyer_image_type) {
          try {
            // Convert array back to Uint8Array and then to base64
            const uint8Array = new Uint8Array(promotion.flyer_image_data)
            const blob = new Blob([uint8Array], { type: promotion.flyer_image_type })
            const base64 = await blobToBase64(blob)
            return {
              ...promotion,
              flyer_image_url: base64 // Override with base64 data URL
            }
          } catch (error) {
            console.error('Error converting image data:', error)
            return promotion
          }
        }
        return promotion
      }))
      
      setPromotions(promotionsWithImages)
    } catch (error: any) {
      toast.error('Error al cargar promociones: ' + error.message)
    }
  }

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const deleteAutomation = async (automationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta automatización?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId)

      if (error) throw error

      await loadAutomations()
      toast.success('Automatización eliminada correctamente')
    } catch (error: any) {
      toast.error('Error al eliminar automatización: ' + error.message)
    }
  }

  const toggleAutomation = async (automationId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !isActive })
        .eq('id', automationId)

      if (error) throw error
      
      toast.success(`Automatización ${!isActive ? 'activada' : 'desactivada'}`)
      loadAutomations()
    } catch (error: any) {
      toast.error('Error al actualizar automatización: ' + error.message)
    }
  }

  const saveLoyaltySettings = async () => {
    if (!business?.id || !loyaltySettings) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('loyalty_settings')
        .upsert(loyaltySettings)
      
      if (error) throw error
      
      toast.success('Configuración guardada correctamente')
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const addPurchaseRange = () => {
    if (!loyaltySettings || !newRange.min || !newRange.points) {
      toast.error('Completa todos los campos del rango')
      return
    }

    const updatedRanges = [...loyaltySettings.purchase_ranges, newRange]
    setLoyaltySettings({
      ...loyaltySettings,
      purchase_ranges: updatedRanges.sort((a, b) => a.min - b.min)
    })
    setNewRange({ min: 0, max: null, points: 0 })
  }

  const removePurchaseRange = (index: number) => {
    if (!loyaltySettings) return
    
    const updatedRanges = loyaltySettings.purchase_ranges.filter((_, i) => i !== index)
    setLoyaltySettings({
      ...loyaltySettings,
      purchase_ranges: updatedRanges
    })
  }

  const addVipLevel = () => {
    if (!loyaltySettings || !newVipLevel.name || !newVipLevel.min_points) {
      toast.error('Completa el nombre y puntos mínimos')
      return
    }

    const filteredBenefits = newVipLevel.benefits.filter(b => b.trim() !== '')
    if (filteredBenefits.length === 0) {
      toast.error('Agrega al menos un beneficio')
      return
    }

    const updatedLevels = [...loyaltySettings.vip_levels, { ...newVipLevel, benefits: filteredBenefits }]
    setLoyaltySettings({
      ...loyaltySettings,
      vip_levels: updatedLevels.sort((a, b) => a.min_points - b.min_points)
    })
    setNewVipLevel({ name: '', min_points: 0, benefits: [''] })
  }

  const removeVipLevel = (index: number) => {
    if (!loyaltySettings) return
    
    const updatedLevels = loyaltySettings.vip_levels.filter((_, i) => i !== index)
    setLoyaltySettings({
      ...loyaltySettings,
      vip_levels: updatedLevels
    })
  }

  const addSpecialDate = () => {
    if (!loyaltySettings || !newSpecialDate.name || !newSpecialDate.date) {
      toast.error('Completa el nombre y la fecha')
      return
    }

    const specialDateWithId = {
      ...newSpecialDate,
      id: Date.now().toString()
    }

    setLoyaltySettings({
      ...loyaltySettings,
      special_dates: [...loyaltySettings.special_dates, specialDateWithId]
    })
    setNewSpecialDate({ id: '', name: '', date: '', points_multiplier: 1, bonus_points: 0 })
  }

  const removeSpecialDate = (id: string) => {
    if (!loyaltySettings) return
    
    setLoyaltySettings({
      ...loyaltySettings,
      special_dates: loyaltySettings.special_dates.filter(date => date.id !== id)
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS' 
    }).format(amount)
  }

  const automationTypes = [
    {
      type: 'birthday',
      name: 'Cumpleaños',
      icon: Calendar,
      description: 'Envía mensajes automáticos antes del cumpleaños',
      color: 'bg-pink-500'
    },
    {
      type: 'missing_field',
      name: 'Campo Faltante',
      icon: MessageCircle,
      description: 'Solicita información faltante de clientes (Instagram, dirección, etc.)',
      color: 'bg-purple-500'
    },
    {
      type: 'inactive_customers',
      name: 'Clientes Inactivos',
      icon: Users,
      description: 'Reconecta con clientes que no vienen hace tiempo',
      color: 'bg-red-500'
    },
    {
      type: 'points_notification',
      name: 'Notificación de Puntos',
      icon: Star,
      description: 'Notifica cuando se cargan puntos automáticamente',
      color: 'bg-yellow-500'
    }
  ]

  const getAutomationTypeConfig = (type: string) => {
    return automationTypes.find(t => t.type === type) || automationTypes[0]
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
          <h1 className="text-3xl font-bold mb-2">Programa de Fidelidad</h1>
          <p className="text-muted-foreground">
            Configura puntos, niveles VIP y recompensas para tus clientes
          </p>
        </div>
        
        <Button onClick={saveLoyaltySettings} disabled={saving} className="animate-scale-hover">
          <Settings className="mr-2 h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      {loyaltySettings && (
        <Tabs defaultValue="ranges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ranges">Rangos de Compra</TabsTrigger>
            <TabsTrigger value="events">Eventos Especiales</TabsTrigger>
            <TabsTrigger value="vip">Niveles VIP</TabsTrigger>
            <TabsTrigger value="automations">Automatizaciones</TabsTrigger>
            <TabsTrigger value="general">Configuración General</TabsTrigger>
          </TabsList>

          {/* Purchase Ranges Tab */}
          <TabsContent value="ranges" className="space-y-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Puntos por Compras
                </CardTitle>
                <CardDescription>
                  Configure diferentes rangos de compra y los puntos que otorgan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new range form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Desde ($)</Label>
                    <Input
                      type="number"
                      value={newRange.min || ''}
                      onChange={(e) => setNewRange({...newRange, min: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hasta ($)</Label>
                    <Input
                      type="number"
                      value={newRange.max || ''}
                      onChange={(e) => setNewRange({...newRange, max: parseInt(e.target.value) || null})}
                      placeholder="Sin límite"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puntos</Label>
                    <Input
                      type="number"
                      value={newRange.points || ''}
                      onChange={(e) => setNewRange({...newRange, points: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addPurchaseRange} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </div>

                {/* Existing ranges */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Rangos Configurados</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rango de Compra</TableHead>
                        <TableHead>Puntos Otorgados</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loyaltySettings.purchase_ranges.map((range, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {formatCurrency(range.min)} - {range.max ? formatCurrency(range.max) : 'Sin límite'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{range.points} puntos</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePurchaseRange(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Special Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Welcome Points */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Puntos de Bienvenida</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Puntos para nuevos clientes</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.welcome_points}
                      onChange={(e) => setLoyaltySettings({
                        ...loyaltySettings,
                        welcome_points: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Birthday Points */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Puntos de Cumpleaños</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Puntos el día del cumpleaños</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.birthday_bonus_points}
                      onChange={(e) => setLoyaltySettings({
                        ...loyaltySettings,
                        birthday_bonus_points: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Referral Points */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Puntos por Referido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Puntos por traer nuevos clientes</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.referral_points}
                      onChange={(e) => setLoyaltySettings({
                        ...loyaltySettings,
                        referral_points: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Special Dates */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Fechas Especiales
                </CardTitle>
                <CardDescription>
                  Configure bonificaciones para fechas específicas del año
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add special date form */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Nombre del Evento</Label>
                    <Input
                      value={newSpecialDate.name}
                      onChange={(e) => setNewSpecialDate({...newSpecialDate, name: e.target.value})}
                      placeholder="Navidad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={newSpecialDate.date}
                      onChange={(e) => setNewSpecialDate({...newSpecialDate, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Multiplicador</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newSpecialDate.points_multiplier}
                      onChange={(e) => setNewSpecialDate({...newSpecialDate, points_multiplier: parseFloat(e.target.value) || 1})}
                      placeholder="2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puntos Extra</Label>
                    <Input
                      type="number"
                      value={newSpecialDate.bonus_points}
                      onChange={(e) => setNewSpecialDate({...newSpecialDate, bonus_points: parseInt(e.target.value) || 0})}
                      placeholder="100"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addSpecialDate} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </div>

                {/* Existing special dates */}
                {loyaltySettings.special_dates.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Fechas Configuradas</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Evento</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Beneficios</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loyaltySettings.special_dates.map((date) => (
                          <TableRow key={date.id}>
                            <TableCell className="font-medium">{date.name}</TableCell>
                            <TableCell>{new Date(date.date).toLocaleDateString('es-ES')}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="secondary">x{date.points_multiplier} puntos</Badge>
                                {date.bonus_points > 0 && (
                                  <Badge variant="outline">+{date.bonus_points} extra</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSpecialDate(date.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIP Levels Tab */}
          <TabsContent value="vip" className="space-y-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Niveles VIP
                </CardTitle>
                <CardDescription>
                  Configure niveles VIP y sus beneficios exclusivos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add VIP level form */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Agregar Nuevo Nivel VIP</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Nivel</Label>
                      <Input
                        value={newVipLevel.name}
                        onChange={(e) => setNewVipLevel({...newVipLevel, name: e.target.value})}
                        placeholder="Platino"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Puntos Mínimos</Label>
                      <Input
                        type="number"
                        value={newVipLevel.min_points || ''}
                        onChange={(e) => setNewVipLevel({...newVipLevel, min_points: parseInt(e.target.value) || 0})}
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color (opcional)</Label>
                      <Input
                        type="color"
                        value={newVipLevel.color || '#FFD700'}
                        onChange={(e) => setNewVipLevel({...newVipLevel, color: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Beneficios</Label>
                    {newVipLevel.benefits.map((benefit, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={benefit}
                          onChange={(e) => {
                            const updatedBenefits = [...newVipLevel.benefits]
                            updatedBenefits[index] = e.target.value
                            setNewVipLevel({...newVipLevel, benefits: updatedBenefits})
                          }}
                          placeholder="Describe el beneficio..."
                        />
                        {newVipLevel.benefits.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updatedBenefits = newVipLevel.benefits.filter((_, i) => i !== index)
                              setNewVipLevel({...newVipLevel, benefits: updatedBenefits})
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewVipLevel({...newVipLevel, benefits: [...newVipLevel.benefits, '']})}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Beneficio
                    </Button>
                  </div>
                  
                  <Button onClick={addVipLevel}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Nivel VIP
                  </Button>
                </div>

                {/* Existing VIP levels */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Niveles Configurados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loyaltySettings.vip_levels.map((level, index) => (
                      <Card key={index} className="animate-scale-hover">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: level.color || '#FFD700' }}
                              />
                              {level.name}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVipLevel(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge variant="secondary">{level.min_points.toLocaleString()} puntos mínimos</Badge>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Beneficios:</Label>
                            <ul className="text-sm space-y-1">
                              {level.benefits.map((benefit, bIndex) => (
                                <li key={bIndex} className="flex items-start gap-2">
                                  <Star className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations" className="space-y-6" data-section="automations">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Automatizaciones
                </CardTitle>
                <CardDescription>
                  Configura mensajes automáticos para mejorar la experiencia de tus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Layout dividido en 2 columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Columna izquierda - Automatizaciones */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Automatizaciones Predefinidas</h3>
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Templates Oficiales
                      </Badge>
                    </div>
                  
                  {automations.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Configurando automatizaciones...</h3>
                        <p className="text-muted-foreground text-center mb-6">
                          Las automatizaciones predefinidas se están creando automáticamente
                        </p>
                        <Button 
                          variant="outline"
                          onClick={() => window.location.reload()} 
                          className="gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Actualizar
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {automations.slice(0, 5).map((automation) => {
                        const config = getAutomationTypeConfig(automation.automation_type)
                        const Icon = config.icon
                        
                        return (
                          <Card key={automation.id} className="animate-slide-up">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Icon className="h-5 w-5" />
                                  <div>
                                    <h4 className="font-medium">{automation.name}</h4>
                                    <p className="text-sm text-muted-foreground">{config.name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={automation.is_active ? "default" : "secondary"}>
                                    {automation.is_active ? "Activa" : "Inactiva"}
                                  </Badge>
                                  <Switch
                                    checked={automation.is_active}
                                    onCheckedChange={() => toggleAutomation(automation.id, automation.is_active)}
                                    size="sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAutomation(automation)
                                      setSelectedAutomationType(automation.automation_type)
                                      setShowAutomationForm(true)
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {automation.message_template && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {automation.message_template.substring(0, 100)}...
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                {automation.trigger_days && (
                                  <span>Días: {automation.trigger_days}</span>
                                )}
                                {automation.points_reward && (
                                  <span>Puntos: {automation.points_reward}</span>
                                )}
                                <span>Frecuencia: {automation.frequency_type}</span>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                  </div>

                  {/* Columna derecha - Promociones */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Promociones</h3>
                      <Button 
                        onClick={() => {
                          setEditingPromotion(null)
                          setShowPromotionForm(true)
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Nueva Promoción
                      </Button>
                    </div>
                    {promotions.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground mb-4">
                            No hay promociones disponibles
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Crea promociones para usar en tus automatizaciones
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {promotions.map((promotion) => (
                          <Card key={promotion.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm">{promotion.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {promotion.promotion_type === 'birthday' && '🎂'}
                                  {promotion.promotion_type === 'instagram' && '📱'}
                                  {promotion.promotion_type === 'inactive' && '💔'}
                                  {promotion.promotion_type === 'general' && '🌟'}
                                  {' '}{promotion.promotion_type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3">
                                {promotion.description?.substring(0, 100)}{promotion.description && promotion.description.length > 100 ? '...' : ''}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex gap-2 text-xs">
                                  {promotion.discount_percentage && (
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                      {promotion.discount_percentage}% OFF
                                    </span>
                                  )}
                                  {promotion.points_reward && (
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                      +{promotion.points_reward} pts
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={promotion.is_active ? 'default' : 'secondary'}>
                                    {promotion.is_active ? 'Activa' : 'Inactiva'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPromotion(promotion)
                                      setShowPromotionForm(true)
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Dialog para crear/editar automatizaciones */}
                <Dialog open={showAutomationForm} onOpenChange={setShowAutomationForm}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAutomation ? 'Editar Automatización' : 'Nueva Automatización'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura los mensajes automáticos para tus clientes
                      </DialogDescription>
                    </DialogHeader>
                    <AutomationForm 
                      automation={editingAutomation}
                      promotions={promotions}
                      initialType={selectedAutomationType}
                      onSave={() => {
                        setShowAutomationForm(false)
                        setEditingAutomation(null)
                        setSelectedAutomationType('')
                        loadAutomations()
                        toast.success(editingAutomation ? 'Automatización actualizada' : 'Automatización creada')
                      }}
                      onCancel={() => {
                        setShowAutomationForm(false)
                        setEditingAutomation(null)
                        setSelectedAutomationType('')
                      }}
                    />
                  </DialogContent>
                </Dialog>

                {/* Dialog para crear/editar promociones */}
                <Dialog open={showPromotionForm} onOpenChange={setShowPromotionForm}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura las promociones para usar en tus automatizaciones
                      </DialogDescription>
                    </DialogHeader>
                    <PromotionForm 
                      promotion={editingPromotion}
                      onSave={() => {
                        setShowPromotionForm(false)
                        setEditingPromotion(null)
                        loadPromotions()
                        toast.success(editingPromotion ? 'Promoción actualizada' : 'Promoción creada')
                      }}
                      onCancel={() => {
                        setShowPromotionForm(false)
                        setEditingPromotion(null)
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Configuration Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Points Expiry */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Vencimiento de Puntos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Días para vencimiento</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.points_expiry_days}
                      onChange={(e) => setLoyaltySettings({
                        ...loyaltySettings,
                        points_expiry_days: parseInt(e.target.value) || 365
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Los puntos vencerán después de esta cantidad de días
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Notificar días antes</Label>
                    <Input
                      type="number"
                      value={loyaltySettings.expiry_notification_days}
                      onChange={(e) => setLoyaltySettings({
                        ...loyaltySettings,
                        expiry_notification_days: parseInt(e.target.value) || 30
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Avisar a los clientes con esta anticipación
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Program Summary */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle>Resumen del Programa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rangos de compra:</span>
                      <Badge variant="secondary">{loyaltySettings.purchase_ranges.length}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Niveles VIP:</span>
                      <Badge variant="secondary">{loyaltySettings.vip_levels.length}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fechas especiales:</span>
                      <Badge variant="secondary">{loyaltySettings.special_dates.length}</Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Puntos de bienvenida:</span>
                      <Badge>{loyaltySettings.welcome_points}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Puntos de cumpleaños:</span>
                      <Badge>{loyaltySettings.birthday_bonus_points}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Puntos por referido:</span>
                      <Badge>{loyaltySettings.referral_points}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default function LoyaltyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LoyaltyPageContent />
    </Suspense>
  )
}

// Componente para el formulario de automatizaciones
interface AutomationFormProps {
  automation?: Automation | null
  promotions: Promotion[]
  initialType?: string
  onSave: () => void
  onCancel: () => void
}

function AutomationForm({ automation, promotions, initialType, onSave, onCancel }: AutomationFormProps) {
  const { business } = useAuth()
  const [formData, setFormData] = useState({
    name: automation?.name || '',
    automation_type: automation?.automation_type || initialType || 'birthday',
    trigger_days: automation?.trigger_days || 7,
    message_template: automation?.message_template || '',
    promotion_id: automation?.promotion_id || '',
    points_reward: automation?.points_reward || 0,
    frequency_type: automation?.frequency_type || 'once',
    max_sends_per_customer: automation?.max_sends_per_customer || 1,
    is_active: automation?.is_active ?? true,
    missing_field_type: automation?.missing_field_type || '',
    target_audience: automation?.target_audience || 'all'
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const automationTypes = [
    {
      type: 'birthday',
      name: 'Cumpleaños',
      icon: Calendar,
      description: 'Envía mensajes automáticos antes del cumpleaños',
      color: 'bg-pink-500',
      defaultTemplate: '¡Hola {name}! 🎂 Se acerca tu cumpleaños y queremos celebrarlo contigo. ¡Tenemos una sorpresa especial esperándote!'
    },
    {
      type: 'missing_field',
      name: 'Campo Faltante',
      icon: MessageCircle,
      description: 'Solicita información faltante de clientes',
      color: 'bg-purple-500',
      defaultTemplate: '¡Hola {name}! Nos encantaría conocerte mejor. ¿Podrías compartir tu {missing_field}? Te daremos puntos extras.'
    },
    {
      type: 'inactive_customers',
      name: 'Clientes Inactivos',
      icon: Users,
      description: 'Reconecta con clientes que no vienen hace tiempo',
      color: 'bg-red-500',
      defaultTemplate: '¡Hola {name}! 💔 Te extrañamos en {business_name}. ¡Ven a visitarnos y disfruta de una promoción especial!'
    },
    {
      type: 'points_notification',
      name: 'Notificación de Puntos',
      icon: Star,
      description: 'Notifica cuando se cargan puntos automáticamente',
      color: 'bg-yellow-500',
      defaultTemplate: '¡Hola {name}! ⭐ Tienes {points} puntos acumulados. ¡Canjéalos por increíbles premios!'
    }
  ]

  const selectedType = automationTypes.find(type => type.type === formData.automation_type)

  useEffect(() => {
    if (selectedType && !automation?.message_template && !formData.message_template) {
      setFormData(prev => ({
        ...prev,
        message_template: selectedType.defaultTemplate
      }))
    }
  }, [formData.automation_type, selectedType, automation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id) return

    setSaving(true)
    try {
      const dataToSave = {
        ...formData,
        business_id: business.id,
        promotion_id: formData.promotion_id === 'none' ? null : formData.promotion_id || null,
        points_reward: formData.points_reward || null,
        trigger_days: formData.trigger_days || null,
        missing_field_type: formData.missing_field_type || null,
        target_audience: formData.target_audience || 'all'
      }

      if (automation) {
        const { error } = await supabase
          .from('automations')
          .update(dataToSave)
          .eq('id', automation.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('automations')
          .insert([dataToSave])
        
        if (error) throw error
      }

      onSave()
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nombre de la Automatización</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Recordatorio de Cumpleaños"
            required
          />
        </div>

        <div>
          <Label htmlFor="type">Tipo de Automatización</Label>
          <Select
            value={formData.automation_type}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              automation_type: value as any,
              message_template: automationTypes.find(t => t.type === value)?.defaultTemplate || ''
            }))}
            disabled={automation !== null}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {automationTypes.map((type) => (
                <SelectItem key={type.type} value={type.type}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedType?.type === 'birthday' && (
          <div>
            <Label htmlFor="trigger_days">Días antes del cumpleaños</Label>
            <Input
              id="trigger_days"
              type="number"
              min="1"
              max="30"
              value={formData.trigger_days}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger_days: parseInt(e.target.value) }))}
            />
          </div>
        )}

        {selectedType?.type === 'inactive_customers' && (
          <div>
            <Label htmlFor="trigger_days">Días sin actividad</Label>
            <Input
              id="trigger_days"
              type="number"
              min="7"
              max="365"
              value={formData.trigger_days}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger_days: parseInt(e.target.value) }))}
            />
          </div>
        )}

        {selectedType?.type === 'missing_field' && (
          <>
            <div>
              <Label htmlFor="missing_field_type">Campo a solicitar</Label>
              <Select
                value={formData.missing_field_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, missing_field_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el campo faltante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="address">Dirección</SelectItem>
                  <SelectItem value="birthday">Fecha de cumpleaños</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="points_reward">Puntos a otorgar</Label>
              <Input
                id="points_reward"
                type="number"
                min="0"
                value={formData.points_reward}
                onChange={(e) => setFormData(prev => ({ ...prev, points_reward: parseInt(e.target.value) }))}
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="message_template">Mensaje</Label>
          <Textarea
            id="message_template"
            value={formData.message_template}
            onChange={(e) => setFormData(prev => ({ ...prev, message_template: e.target.value }))}
            placeholder="Escribe el mensaje que se enviará automáticamente..."
            rows={4}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Variables disponibles: {'{name}'}, {'{business_name}'}, {'{points}'}
          </p>
        </div>

        {promotions.length > 0 && (
          <div>
            <Label htmlFor="promotion">Promoción (Opcional)</Label>
            <Select
              value={formData.promotion_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, promotion_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una promoción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin promoción</SelectItem>
                {promotions.map((promo) => (
                  <SelectItem key={promo.id} value={promo.id}>
                    {promo.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="frequency">Frecuencia de envío</Label>
          <Select
            value={formData.frequency_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, frequency_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Una vez</SelectItem>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="max_sends">Máximo envíos por cliente</Label>
          <Input
            id="max_sends"
            type="number"
            min="1"
            max="10"
            value={formData.max_sends_per_customer}
            onChange={(e) => setFormData(prev => ({ ...prev, max_sends_per_customer: parseInt(e.target.value) }))}
          />
        </div>

        {/* Configuración de Audiencia Objetivo */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Audiencia Objetivo
          </h4>
          
          <div>
            <Label htmlFor="target_audience">¿A quién enviar este mensaje?</Label>
            <Select
              value={formData.target_audience || 'all'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📢 Todos los clientes activos</SelectItem>
                <SelectItem value="birthday_near">🎂 Clientes con cumpleaños cerca</SelectItem>
                <SelectItem value="high_visits">⭐ Clientes con más visitas (5+)</SelectItem>
                <SelectItem value="low_visits">👋 Clientes con pocas visitas (1-2)</SelectItem>
                <SelectItem value="missing_fields">📝 Clientes con campos incompletos</SelectItem>
                <SelectItem value="new_points">🎯 Clientes que recién cargaron puntos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.target_audience === 'birthday_near' && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Se enviará a clientes cuyo cumpleaños esté dentro del rango configurado en "Días antes del cumpleaños"
              </p>
            </div>
          )}
          
          {formData.target_audience === 'high_visits' && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                💡 Se enviará a clientes VIP con 5 o más visitas registradas
              </p>
            </div>
          )}
          
          {formData.target_audience === 'low_visits' && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">
                💡 Se enviará a clientes nuevos con 1-2 visitas para motivar su regreso
              </p>
            </div>
          )}
          
          {formData.target_audience === 'missing_fields' && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                💡 Se enviará a clientes sin fecha de cumpleaños, email o datos de contacto incompletos
              </p>
            </div>
          )}
          
          {formData.target_audience === 'new_points' && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                💡 Se enviará a clientes que cargaron puntos en los últimos 7 días
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Selecciona el grupo específico de clientes que recibirá esta automatización
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">Automatización activa</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : (automation ? 'Actualizar' : 'Crear')}
        </Button>
      </div>
    </form>
  )
}

// Promoción Form Component
interface PromotionFormProps {
  promotion?: Promotion | null
  onSave: () => void
  onCancel: () => void
}

function PromotionForm({ promotion, onSave, onCancel }: PromotionFormProps) {
  const { business } = useAuth()
  const [formData, setFormData] = useState({
    title: promotion?.title || '',
    description: promotion?.description || '',
    promotion_type: promotion?.promotion_type || 'general',
    discount_percentage: promotion?.discount_percentage || 0,
    points_reward: promotion?.points_reward || 0,
    flyer_image_url: promotion?.flyer_image_url || '',
    valid_from: promotion?.valid_from || new Date().toISOString().split('T')[0],
    valid_until: promotion?.valid_until || '',
    is_active: promotion?.is_active ?? true
  })
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const supabase = createClient()

  // Initialize preview URL from existing image data
  useEffect(() => {
    if (promotion?.flyer_image_url) {
      setPreviewUrl(promotion.flyer_image_url)
    } else {
      setPreviewUrl('')
    }
  }, [promotion])

  const loadImageFromDatabase = async () => {
    if (!promotion?.id) return
    
    try {
      const { data, error } = await supabase
        .rpc('get_promotion_image_base64', { promotion_id: promotion.id })

      if (error) throw error
      if (data) {
        setPreviewUrl(data)
      }
    } catch (error) {
      console.error('Error loading image from database:', error)
    }
  }

  // Handle file selection and preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos JPG y PNG')
      e.target.value = '' // Clear input
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 5MB permitido')
      e.target.value = '' // Clear input
      return
    }

    setSelectedFile(file)
    
    // Create preview URL immediately
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        setPreviewUrl(result)
        console.log('Preview URL set:', result.substring(0, 50) + '...')
      }
    }
    reader.onerror = () => {
      toast.error('Error al leer el archivo')
    }
    reader.readAsDataURL(file)
  }

  // Convert file to binary data for database storage
  const convertFileToImageData = async (file: File) => {
    return new Promise<{data: ArrayBuffer, type: string, size: number}>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as ArrayBuffer
        resolve({
          data: result,
          type: file.type,
          size: file.size
        })
      }
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Remove image
  const removeImage = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setFormData(prev => ({ ...prev, flyer_image_url: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id) return

    setSaving(true)
    try {
      let imageUrl = formData.flyer_image_url
      let imageData = null
      let imageType = null
      let imageSize = null

      // Process new image if selected
      if (selectedFile) {
        try {
          const fileData = await convertFileToImageData(selectedFile)
          imageData = Array.from(new Uint8Array(fileData.data)) // Convert to array for Supabase
          imageType = fileData.type
          imageSize = fileData.size
          imageUrl = null // Clear URL when storing binary data
        } catch (error) {
          console.error('Error converting file:', error)
          toast.error('Error al procesar la imagen')
          return
        }
      }

      const dataToSave = {
        ...formData,
        business_id: business.id,
        discount_percentage: formData.discount_percentage || null,
        points_reward: formData.points_reward || null,
        flyer_image_url: imageUrl || null,
        flyer_image_data: imageData,
        flyer_image_type: imageType,
        flyer_image_size: imageSize
      }

      if (promotion) {
        const { error } = await supabase
          .from('promotions')
          .update(dataToSave)
          .eq('id', promotion.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert([dataToSave])
        
        if (error) throw error
      }

      onSave()
    } catch (error: any) {
      toast.error('Error al guardar promoción: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título de la Promoción</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ej: ¡Feliz Cumpleaños! 🎂"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe los detalles de la promoción"
            rows={3}
            required
          />
        </div>

        <div>
          <Label htmlFor="promotion_type">Tipo de Promoción</Label>
          <Select
            value={formData.promotion_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, promotion_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="birthday">🎂 Cumpleaños</SelectItem>
              <SelectItem value="instagram">📱 Instagram</SelectItem>
              <SelectItem value="inactive">💔 Clientes Inactivos</SelectItem>
              <SelectItem value="general">🌟 General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discount_percentage">Descuento (%)</Label>
            <Input
              id="discount_percentage"
              type="number"
              min="0"
              max="100"
              value={formData.discount_percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
              placeholder="25"
            />
          </div>
          <div>
            <Label htmlFor="points_reward">Puntos a otorgar</Label>
            <Input
              id="points_reward"
              type="number"
              min="0"
              value={formData.points_reward}
              onChange={(e) => setFormData(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 0 }))}
              placeholder="100"
            />
          </div>
        </div>

        <div>
          <Label>Imagen de la promoción (opcional)</Label>
          <div className="space-y-4">
            {/* File input */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="promotion-image"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('promotion-image')?.click()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Seleccionar imagen
              </Button>
              <span className="text-sm text-muted-foreground">
                JPG o PNG, máximo 5MB
              </span>
            </div>

            {/* Image preview */}
            {previewUrl && (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Alternative URL input */}
            <div className="pt-2 border-t">
              <Label htmlFor="flyer_image_url" className="text-sm text-muted-foreground">
                O ingresa una URL de imagen:
              </Label>
              <Input
                id="flyer_image_url"
                value={formData.flyer_image_url}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, flyer_image_url: e.target.value }))
                  if (e.target.value && !selectedFile) {
                    setPreviewUrl(e.target.value)
                  }
                }}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valid_from">Válida desde</Label>
            <Input
              id="valid_from"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="valid_until">Válida hasta</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
          <Label htmlFor="is_active">Promoción activa</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : (promotion ? 'Actualizar' : 'Crear')}
        </Button>
      </div>
    </form>
  )
}