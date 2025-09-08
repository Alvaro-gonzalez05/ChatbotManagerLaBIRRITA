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
  MessageCircle,
  Menu
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
  vip_criteria?: {
    monthly_visits: number
    monthly_spending: number
    total_visits: number
    total_spending: number
  }
}

interface RedeemableItem {
  id: string
  business_id: string
  name: string
  description: string | null
  points_required: number
  category: string | null
  image_url: string | null
  is_available: boolean
  stock: number | null
  terms_conditions: string | null
  created_at: string
  updated_at: string
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
  missing_field_type?: string
  target_audience?: string
  meta_template_name?: string
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
  valid_from?: string
  valid_until?: string
  is_active?: boolean
}

function LoyaltyPageContent() {
  const { business } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [redeemableItems, setRedeemableItems] = useState<RedeemableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executingAutomations, setExecutingAutomations] = useState<string[]>([])
  
  // Automation form states
  const [showAutomationForm, setShowAutomationForm] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [selectedAutomationType, setSelectedAutomationType] = useState<string>('')

  // Promotion form states
  const [showPromotionForm, setShowPromotionForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

  // Redeemable items form states
  const [editingRedeemableItem, setEditingRedeemableItem] = useState<RedeemableItem | null>(null)
  const [newRedeemableItem, setNewRedeemableItem] = useState<Partial<RedeemableItem>>({
    name: '',
    description: '',
    points_required: 0,
    category: '',
    is_available: true,
    stock: null,
    terms_conditions: ''
  })
  
  // Modal state for mobile tabs
  const [showMobileTabsModal, setShowMobileTabsModal] = useState(false)
  const [currentTab, setCurrentTab] = useState("ranges")
  
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

  // VIP Criteria states
  const [vipCriteria, setVipCriteria] = useState({
    monthly_visits: 5,
    monthly_spending: 25000,
    total_visits: 10,
    total_spending: 50000
  })

  const supabase = createClient()

  useEffect(() => {
    if (business?.id) {
      loadLoyaltySettings()
      loadAutomations()
      loadPromotions()
      loadRedeemableItems()
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
        // Actualizar criterios VIP si existen en la base de datos
        if (data.vip_criteria) {
          setVipCriteria(data.vip_criteria)
        }
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
          ],
          vip_criteria: {
            monthly_visits: 5,
            monthly_spending: 25000,
            total_visits: 10,
            total_spending: 50000
          }
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

  const loadRedeemableItems = async () => {
    if (!business?.id) return
    
    try {
      const { data, error } = await supabase
        .from('redeemable_items')
        .select('*')
        .eq('business_id', business.id)
        .order('points_required', { ascending: true })

      if (error) throw error
      setRedeemableItems(data || [])
    } catch (error: any) {
      toast.error('Error al cargar productos canjeables: ' + error.message)
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

  const executeAutomationsManually = async () => {
    if (!business?.id) {
      toast.error('No se puede ejecutar automatizaciones sin negocio seleccionado')
      return
    }

    setExecutingAutomations(['all'])
    try {
      const response = await fetch(`/api/automations/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al ejecutar automatizaciones')
      }

      const result = await response.json()
      toast.success(`✅ Automatizaciones ejecutadas: ${result.summary || 'Proceso completado'}`)
      
    } catch (error: any) {
      console.error('Error ejecutando automatizaciones:', error)
      toast.error('Error al ejecutar automatizaciones: ' + error.message)
    } finally {
      setExecutingAutomations([])
    }
  }

  const executeSpecificAutomation = async (automationType: string, automationId: string) => {
    if (!business?.id) {
      toast.error('No se puede ejecutar automatización sin negocio seleccionado')
      return
    }

    setExecutingAutomations([automationId])
    try {
      const response = await fetch(`/api/automations/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationId: automationId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al ejecutar automatización')
      }

      const result = await response.json()
      toast.success(`✅ Automatización ejecutada: ${result.summary || 'Proceso completado'}`)
      
    } catch (error: any) {
      console.error('Error ejecutando automatización:', error)
      toast.error('Error al ejecutar automatización: ' + error.message)
    } finally {
      setExecutingAutomations([])
    }
  }

  const updateDynamicVipStatus = async () => {
    if (!business?.id) {
      toast.error('No se puede actualizar VIP sin negocio seleccionado')
      return
    }

    setExecutingAutomations(['vip-update'])
    try {
      // Obtener todos los clientes
      const { data: allCustomers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)

      if (customerError) throw customerError

      let vipUpdated = 0
      const now = new Date()
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      for (const customer of allCustomers || []) {
        const lastInteraction = new Date(customer.last_interaction)
        const isRecentlyActive = lastInteraction >= oneMonthAgo

        // Calcular actividad mensual (aproximada basada en actividad reciente)
        const monthlyVisits = isRecentlyActive ? customer.visit_count : 0
        const monthlySpending = isRecentlyActive ? customer.total_spent * 0.3 : 0 // Estimar 30% del gasto en el último mes
        
        // Criterios configurables para VIP automático
        const meetsMonthlyVisits = monthlyVisits >= vipCriteria.monthly_visits
        const meetsMonthlySpending = monthlySpending >= vipCriteria.monthly_spending
        const meetsTotalVisits = customer.visit_count >= vipCriteria.total_visits
        const meetsTotalSpending = customer.total_spent >= vipCriteria.total_spending

        const isVipEligible = (
          meetsMonthlyVisits || 
          meetsMonthlySpending || 
          meetsTotalVisits || 
          meetsTotalSpending
        )

        if (isVipEligible) {
          // Verificar si ya tiene etiqueta VIP
          const currentTags = customer.tags || []
          if (!currentTags.includes('VIP')) {
            const updatedTags = [...currentTags, 'VIP']
            
            let promotionReason = []
            if (meetsMonthlyVisits) promotionReason.push(`${monthlyVisits} visitas mensuales`)
            if (meetsMonthlySpending) promotionReason.push(`$${monthlySpending.toLocaleString()} gasto mensual`)
            if (meetsTotalVisits) promotionReason.push(`${customer.visit_count} visitas totales`)
            if (meetsTotalSpending) promotionReason.push(`$${customer.total_spent.toLocaleString()} gasto total`)
            
            const { error: updateError } = await supabase
              .from('customers')
              .update({ 
                tags: updatedTags,
                notes: customer.notes ? 
                  `${customer.notes}\n[AUTO-VIP] Promocionado por: ${promotionReason.join(', ')} - ${now.toLocaleDateString()}` :
                  `[AUTO-VIP] Promocionado por: ${promotionReason.join(', ')} - ${now.toLocaleDateString()}`
              })
              .eq('id', customer.id)

            if (!updateError) {
              vipUpdated++
            }
          }
        }
      }

      toast.success(`✅ Sistema VIP actualizado: ${vipUpdated} clientes promocionados a VIP`)
      
    } catch (error: any) {
      console.error('Error actualizando VIP dinámico:', error)
      toast.error('Error al actualizar sistema VIP: ' + error.message)
    } finally {
      setExecutingAutomations([])
    }
  }

  const saveVipCriteria = async () => {
    if (!business?.id || !loyaltySettings) {
      toast.error('No se pueden guardar criterios sin configuración cargada')
      return
    }

    setSaving(true)
    try {
      // Actualizar tanto loyaltySettings como la base de datos
      const updatedSettings = {
        ...loyaltySettings,
        vip_criteria: vipCriteria
      }

      const { error } = await supabase
        .from('loyalty_settings')
        .upsert({
          business_id: business.id,
          ...updatedSettings
        })

      if (error) throw error

      setLoyaltySettings(updatedSettings)
      toast.success('✅ Criterios VIP guardados correctamente en la base de datos')
      
    } catch (error: any) {
      console.error('Error guardando criterios VIP:', error)
      toast.error('Error al guardar criterios VIP: ' + error.message)
    } finally {
      setSaving(false)
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

  // Functions for redeemable items management
  const addRedeemableItem = async () => {
    if (!business?.id || !newRedeemableItem.name || !newRedeemableItem.points_required) {
      toast.error('Completa el nombre y los puntos requeridos')
      return
    }

    try {
      const { error } = await supabase
        .from('redeemable_items')
        .insert({
          business_id: business.id,
          name: newRedeemableItem.name,
          description: newRedeemableItem.description || null,
          points_required: newRedeemableItem.points_required,
          category: newRedeemableItem.category || null,
          is_available: newRedeemableItem.is_available ?? true,
          stock: newRedeemableItem.stock,
          terms_conditions: newRedeemableItem.terms_conditions || null
        })

      if (error) throw error

      toast.success('Producto canjeable agregado correctamente')
      setNewRedeemableItem({
        name: '',
        description: '',
        points_required: 0,
        category: '',
        is_available: true,
        stock: null,
        terms_conditions: ''
      })
      loadRedeemableItems()
    } catch (error: any) {
      toast.error('Error al agregar producto: ' + error.message)
    }
  }

  const updateRedeemableItem = async (item: RedeemableItem, updates: Partial<RedeemableItem>) => {
    try {
      const { error } = await supabase
        .from('redeemable_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      if (error) throw error

      toast.success('Producto actualizado correctamente')
      loadRedeemableItems()
    } catch (error: any) {
      toast.error('Error al actualizar producto: ' + error.message)
    }
  }

  const deleteRedeemableItem = async (item: RedeemableItem) => {
    // Create elegant confirmation toast with Sonner
    toast(
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              ¿Eliminar producto canjeable?
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Se eliminará permanentemente <span className="font-medium">"{item.name}"</span>. 
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 ml-13">
          <button
            onClick={() => {
              toast.dismiss()
              performDeleteItem(item)
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

  const performDeleteItem = async (item: RedeemableItem) => {
    try {
      const { error } = await supabase
        .from('redeemable_items')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      toast.success(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Producto eliminado correctamente</span>
        </div>,
        {
          duration: 4000,
        }
      )
      loadRedeemableItems()
    } catch (error: any) {
      toast.error(
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span>Error al eliminar producto: {error.message}</span>
        </div>,
        {
          duration: 5000,
        }
      )
    }
  }

  const toggleItemAvailability = async (item: RedeemableItem) => {
    await updateRedeemableItem(item, { is_available: !item.is_available })
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
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          {/* Mobile tab selector button */}
          <div className="block sm:hidden">
            <Button
              variant="outline"
              onClick={() => setShowMobileTabsModal(true)}
              className="w-full flex items-center justify-between"
            >
              <span>
                {currentTab === "ranges" && "Rangos de Compra"}
                {currentTab === "rewards" && "Productos Canjeables"}
                {currentTab === "events" && "Eventos Especiales"}
                {currentTab === "vip" && "Niveles VIP"}
                {currentTab === "automations" && "Automatizaciones"}
                {currentTab === "general" && "Configuración General"}
              </span>
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop tabs - hidden on mobile */}
          <TabsList className="hidden sm:grid w-full sm:grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="ranges">Rangos de Compra</TabsTrigger>
            <TabsTrigger value="rewards">Productos Canjeables</TabsTrigger>
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

          {/* Redeemable Items Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Productos Canjeables
                </CardTitle>
                <CardDescription>
                  Configure los productos y servicios que los clientes pueden canjear con sus puntos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new redeemable item form */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Agregar Nuevo Producto Canjeable</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Producto *</Label>
                      <Input
                        value={newRedeemableItem.name || ''}
                        onChange={(e) => setNewRedeemableItem({...newRedeemableItem, name: e.target.value})}
                        placeholder="Cerveza Artesanal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Puntos Requeridos *</Label>
                      <Input
                        type="number"
                        value={newRedeemableItem.points_required || ''}
                        onChange={(e) => setNewRedeemableItem({...newRedeemableItem, points_required: parseInt(e.target.value) || 0})}
                        placeholder="150"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select 
                        value={newRedeemableItem.category || ''} 
                        onValueChange={(value) => setNewRedeemableItem({...newRedeemableItem, category: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bebidas">🍻 Bebidas</SelectItem>
                          <SelectItem value="comida">🍽️ Comida</SelectItem>
                          <SelectItem value="postres">🍰 Postres</SelectItem>
                          <SelectItem value="descuentos">💰 Descuentos</SelectItem>
                          <SelectItem value="experiencias">🎉 Experiencias</SelectItem>
                          <SelectItem value="productos">🎁 Productos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Stock (opcional)</Label>
                      <Input
                        type="number"
                        value={newRedeemableItem.stock || ''}
                        onChange={(e) => setNewRedeemableItem({...newRedeemableItem, stock: e.target.value ? parseInt(e.target.value) : null})}
                        placeholder="Sin límite"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={newRedeemableItem.description || ''}
                      onChange={(e) => setNewRedeemableItem({...newRedeemableItem, description: e.target.value})}
                      placeholder="Describe el producto o servicio que se puede canjear"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Términos y Condiciones (opcional)</Label>
                    <Textarea
                      value={newRedeemableItem.terms_conditions || ''}
                      onChange={(e) => setNewRedeemableItem({...newRedeemableItem, terms_conditions: e.target.value})}
                      placeholder="Ej: Válido por 30 días, no acumulable con otras promociones"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newRedeemableItem.is_available ?? true}
                      onCheckedChange={(checked) => setNewRedeemableItem({...newRedeemableItem, is_available: checked})}
                    />
                    <Label>Disponible para canje</Label>
                  </div>
                  
                  <Button onClick={addRedeemableItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto Canjeable
                  </Button>
                </div>

                {/* Existing redeemable items */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Productos Configurados ({redeemableItems.length})</h3>
                  
                  {redeemableItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No hay productos canjeables configurados</p>
                      <p className="text-sm">Agrega productos para que los clientes puedan canjear sus puntos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {redeemableItems.map((item) => (
                        <Card key={item.id} className="animate-scale-hover">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{item.name}</CardTitle>
                              <Badge variant={item.is_available ? 'default' : 'secondary'}>
                                {item.is_available ? 'Disponible' : 'No disponible'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-primary font-semibold">
                                {item.points_required} pts
                              </Badge>
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {item.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            
                            {item.stock !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Stock:</span>
                                <Badge variant={item.stock > 10 ? 'secondary' : item.stock > 0 ? 'outline' : 'destructive'}>
                                  {item.stock} unidades
                                </Badge>
                              </div>
                            )}
                            
                            {item.terms_conditions && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground">Términos y condiciones</summary>
                                <p className="mt-2 text-muted-foreground">{item.terms_conditions}</p>
                              </details>
                            )}
                            
                            <div className="flex items-center justify-between pt-2">
                              <Switch
                                checked={item.is_available}
                                onCheckedChange={() => toggleItemAvailability(item)}
                              />
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRedeemableItem(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRedeemableItem(item)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Niveles VIP
                    </CardTitle>
                    <CardDescription>
                      Configure niveles VIP y sus beneficios exclusivos
                    </CardDescription>
                  </div>
                  <Button
                    onClick={updateDynamicVipStatus}
                    disabled={executingAutomations.includes('vip-update')}
                    variant="outline"
                    className="gap-2"
                  >
                    <Star className={`h-4 w-4 ${executingAutomations.includes('vip-update') ? 'animate-pulse' : ''}`} />
                    {executingAutomations.includes('vip-update') ? 'Actualizando...' : 'Actualizar VIP Dinámico'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Información del sistema VIP dinámico */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">🤖 Sistema VIP Automático</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Los clientes se promocionan automáticamente a VIP cuando cumplen alguno de estos criterios:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>{vipCriteria.monthly_visits}+ visitas</strong> en el último mes</li>
                    <li>• <strong>${vipCriteria.monthly_spending.toLocaleString()}+</strong> gastados en el último mes</li>
                    <li>• <strong>{vipCriteria.total_visits}+ visitas</strong> en total</li>
                    <li>• <strong>${vipCriteria.total_spending.toLocaleString()}+</strong> gastados en total</li>
                  </ul>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-700">
                      🕒 <strong>Ejecución Automática:</strong> El sistema evalúa y promociona clientes VIP automáticamente cada día a las 2:00 AM
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ También puedes ejecutar "Actualizar VIP Dinámico" manualmente en cualquier momento
                  </p>
                </div>
                {/* Formulario de configuración VIP */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Configurar Criterios VIP Automático</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Visitas Mensuales para VIP</Label>
                      <Input
                        type="number"
                        value={vipCriteria.monthly_visits}
                        onChange={(e) => setVipCriteria({...vipCriteria, monthly_visits: parseInt(e.target.value) || 0})}
                        placeholder="5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Número mínimo de visitas en el último mes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Gasto Mensual para VIP ($)</Label>
                      <Input
                        type="number"
                        value={vipCriteria.monthly_spending}
                        onChange={(e) => setVipCriteria({...vipCriteria, monthly_spending: parseInt(e.target.value) || 0})}
                        placeholder="25000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Monto mínimo gastado en el último mes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Visitas Totales para VIP</Label>
                      <Input
                        type="number"
                        value={vipCriteria.total_visits}
                        onChange={(e) => setVipCriteria({...vipCriteria, total_visits: parseInt(e.target.value) || 0})}
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Número total de visitas históricas
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Gasto Total para VIP ($)</Label>
                      <Input
                        type="number"
                        value={vipCriteria.total_spending}
                        onChange={(e) => setVipCriteria({...vipCriteria, total_spending: parseInt(e.target.value) || 0})}
                        placeholder="50000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Monto total gastado históricamente
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-muted-foreground">
                      Los clientes que cumplan <strong>cualquiera</strong> de estos criterios serán promocionados automáticamente a VIP
                    </p>
                    <Button 
                      onClick={saveVipCriteria} 
                      disabled={saving}
                      variant="outline"
                    >
                      {saving ? 'Guardando...' : 'Guardar Criterios'}
                    </Button>
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
                {/* Layout de dos columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Columna izquierda - Automatizaciones */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Automatizaciones</h3>
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Sistema Predefinido
                      </Badge>
                    </div>
                    
                    {automations.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Configurando automatizaciones...</h3>
                          <p className="text-muted-foreground text-center mb-6">
                            Las automatizaciones se están creando automáticamente
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
                        {automations.map((automation) => {
                          const config = getAutomationTypeConfig(automation.automation_type)
                          const Icon = config.icon
                          
                          return (
                            <Card key={automation.id} className="animate-slide-up">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                      automation.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-sm">{automation.name}</h4>
                                      <p className="text-xs text-muted-foreground">{config.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={automation.is_active ? "default" : "secondary"} className="text-xs">
                                      {automation.is_active ? "Activa" : "Inactiva"}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => executeSpecificAutomation(automation.automation_type, automation.id)}
                                      disabled={executingAutomations.includes(automation.id)}
                                      className="h-7 text-xs gap-1"
                                    >
                                      <Zap className={`h-3 w-3 ${executingAutomations.includes(automation.id) ? 'animate-pulse' : ''}`} />
                                      {executingAutomations.includes(automation.id) ? 'Ejecutando...' : 'Probar'}
                                    </Button>
                                    <Switch
                                      checked={automation.is_active}
                                      onCheckedChange={() => toggleAutomation(automation.id, automation.is_active)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Configuración de Promoción */}
                                {automation.automation_type !== 'points_notification' && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="text-xs font-medium">Promoción Asociada</Label>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => executeSpecificAutomation(automation.automation_type, automation.id)}
                                          disabled={executingAutomations.includes(automation.id)}
                                          className="h-7 text-xs gap-1"
                                        >
                                          <Zap className={`h-3 w-3 ${executingAutomations.includes(automation.id) ? 'animate-pulse' : ''}`} />
                                          {executingAutomations.includes(automation.id) ? 'Ejecutando...' : 'Probar'}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setEditingAutomation(automation)
                                            setShowAutomationForm(true)
                                          }}
                                          className="h-7 text-xs"
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Configurar
                                        </Button>
                                      </div>
                                    </div>
                                    {automation.promotion_id ? (
                                      <div className="p-2 bg-blue-50 rounded-md">
                                        <p className="text-xs text-blue-800 font-medium">
                                          🎁 Promoción configurada
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-yellow-50 rounded-md">
                                        <p className="text-xs text-yellow-800 font-medium">
                                          ⚠️ Sin promoción
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
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

      {/* Mobile Tabs Modal */}
      <Dialog open={showMobileTabsModal} onOpenChange={setShowMobileTabsModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Sección</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Button
              variant={currentTab === "ranges" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("ranges")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Rangos de Compra
            </Button>
            <Button
              variant={currentTab === "rewards" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("rewards")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <Gift className="mr-2 h-4 w-4" />
              Productos Canjeables
            </Button>
            <Button
              variant={currentTab === "events" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("events")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Eventos Especiales
            </Button>
            <Button
              variant={currentTab === "vip" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("vip")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <Star className="mr-2 h-4 w-4" />
              Niveles VIP
            </Button>
            <Button
              variant={currentTab === "automations" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("automations")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <Zap className="mr-2 h-4 w-4" />
              Automatizaciones
            </Button>
            <Button
              variant={currentTab === "general" ? "default" : "ghost"}
              onClick={() => {
                setCurrentTab("general")
                setShowMobileTabsModal(false)
              }}
              className="justify-start"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuración General
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

function AutomationForm({ automation, promotions, onSave, onCancel }: AutomationFormProps) {
  const { business } = useAuth()
  const [promotionId, setPromotionId] = useState(automation?.promotion_id || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  if (!automation) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id || !automation) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('automations')
        .update({ 
          promotion_id: promotionId === 'none' ? null : promotionId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', automation.id)
      
      if (error) throw error

      toast.success('Promoción actualizada correctamente')
      onSave()
    } catch (error: any) {
      toast.error('Error al actualizar promoción: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="promotion">Promoción</Label>
          <Select
            value={promotionId || 'none'}
            onValueChange={setPromotionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una promoción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span>❌</span>
                  <span>Sin promoción</span>
                </div>
              </SelectItem>
              {promotions.map((promo) => (
                <SelectItem key={promo.id} value={promo.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-medium">{promo.title}</span>
                      {promo.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {promo.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      {promo.discount_percentage && (
                        <span className="text-green-600 font-semibold">
                          {promo.discount_percentage}% OFF
                        </span>
                      )}
                      {promo.points_reward && (
                        <span className="text-blue-600 font-semibold">
                          +{promo.points_reward} pts
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={saving}
          className="flex-1"
        >
          {saving ? 'Guardando...' : 'Guardar Promoción'}
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

  const handleDelete = async () => {
    if (!promotion?.id || !business?.id) return

    if (!confirm('¿Estás seguro de que quieres borrar esta promoción? Esta acción no se puede deshacer.')) {
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotion.id)

      if (error) throw error

      toast.success('Promoción eliminada correctamente')
      onSave()
    } catch (error: any) {
      toast.error('Error al eliminar la promoción: ' + error.message)
    } finally {
      setSaving(false)
    }
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
        flyer_image_url: imageUrl,
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

      <div className="flex justify-between gap-2">
        {promotion && (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={saving}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Borrar Promoción
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : (promotion ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </div>
    </form>
  )
}