import { createClient } from '@supabase/supabase-js'
import { WhatsAppBusinessApiService } from './whatsappBusinessApi'

// Tipos de eventos del sistema
export interface AutomationEvent {
  type: 'customer_registered' | 'points_loaded' | 'birthday_check' | 'inactivity_check' | 'field_completed'
  customerId?: string
  businessId: string
  data?: any
  scheduledFor?: Date
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string
  email?: string
  instagram_username?: string
  birthday?: string
  points?: number
  created_at: string
  last_interaction?: string
  visit_count?: number
}

export interface Automation {
  id: string
  business_id: string
  name: string
  automation_type: string
  is_active: boolean
  trigger_days?: number
  message_template: string
  promotion_id?: string
  points_reward?: number
  missing_field_type?: string
  target_audience?: string
  frequency_type?: string
  meta_template_name?: string
}

export class AutomationEventSystem {
  private supabase
  private whatsapp: WhatsAppBusinessApiService

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.whatsapp = new WhatsAppBusinessApiService()
  }

  // 🎯 EVENT: Cliente registrado
  async onCustomerRegistered(customer: Customer): Promise<void> {
    console.log(`📝 Evento: Cliente registrado - ${customer.name} (${customer.business_id})`)
    
    try {
      // Obtener automatizaciones de campos faltantes para este business
      const { data: automations, error } = await this.supabase
        .from('automations')
        .select('*')
        .eq('business_id', customer.business_id)
        .eq('automation_type', 'missing_field')
        .eq('is_active', true)

      if (error || !automations) {
        console.log('No hay automatizaciones de campos faltantes activas')
        return
      }

      // Verificar qué campos faltan al cliente
      const missingFields = this.detectMissingFields(customer)
      console.log(`📊 Campos faltantes detectados para ${customer.name}:`, missingFields)

      // Programar verificaciones para cada campo faltante
      for (const automation of automations) {
        if (automation.missing_field_type && missingFields.includes(automation.missing_field_type)) {
          // Programar envío para dentro de trigger_days
          const scheduledDate = new Date()
          scheduledDate.setDate(scheduledDate.getDate() + (automation.trigger_days || 3))
          
          console.log(`⏰ Programando solicitud de ${automation.missing_field_type} para ${customer.name} el ${scheduledDate.toISOString()}`)
          
          // Por ahora lo ejecutamos inmediatamente para pruebas
          // En producción podrías usar un sistema de colas como Bull/Redis
          await this.sendMissingFieldMessage(customer, automation)
        }
      }

    } catch (error) {
      console.error('Error procesando evento de cliente registrado:', error)
    }
  }

  // 🎂 EVENT: Verificación diaria de cumpleaños (optimizada)
  async checkBirthdaysDaily(): Promise<void> {
    console.log('🎂 Evento: Verificación diaria de cumpleaños...')
    
    try {
      // Query optimizada: Solo clientes con cumpleaños en 7 días
      const { data: customers, error } = await this.supabase
        .from('customers')
        .select('*')
        .not('birthday', 'is', null)
        .not('phone', 'is', null)

      if (error || !customers) {
        console.log('No hay clientes con cumpleaños configurados')
        return
      }

      // Filtrar cumpleaños para mañana (más eficiente que SQL complejo)
      const today = new Date()
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + 7) // 7 días antes
      
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
      const targetDay = String(targetDate.getDate()).padStart(2, '0')
      const birthdayFilter = `${targetMonth}-${targetDay}`

      const birthdayCustomers = customers.filter(customer => {
        if (!customer.birthday) return false
        const birthdayParts = customer.birthday.split('-')
        const customerBirthday = `${birthdayParts[1]}-${birthdayParts[2]}`
        return customerBirthday === birthdayFilter
      })

      console.log(`🎯 Encontrados ${birthdayCustomers.length} clientes con cumpleaños en 7 días`)

      // Procesar cada cliente por business
      const businessGroups = this.groupBy(birthdayCustomers, 'business_id')
      
      for (const [businessId, customers] of Object.entries(businessGroups)) {
        await this.processBirthdayCustomersForBusiness(businessId, customers as Customer[])
      }

    } catch (error) {
      console.error('Error en verificación diaria de cumpleaños:', error)
    }
  }

  // 💤 EVENT: Verificación inteligente de clientes inactivos
  async checkInactiveCustomers(businessId?: string): Promise<void> {
    console.log(`💤 Evento: Verificación de clientes inactivos ${businessId ? `para business: ${businessId}` : '(todos)'}`)
    
    try {
      // Obtener automatizaciones de inactividad
      let query = this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'inactive_customers')
        .eq('is_active', true)

      if (businessId) {
        query = query.eq('business_id', businessId)
      }

      const { data: automations, error } = await query

      if (error || !automations) {
        console.log('No hay automatizaciones de clientes inactivos activas')
        return
      }

      // Procesar cada automatización
      for (const automation of automations) {
        await this.processInactiveCustomersForAutomation(automation)
      }

    } catch (error) {
      console.error('Error verificando clientes inactivos:', error)
    }
  }

  // 🔧 HELPER: Detectar campos faltantes
  private detectMissingFields(customer: Customer): string[] {
    const missing: string[] = []
    
    if (!customer.email) missing.push('email')
    if (!customer.instagram_username) missing.push('instagram_username')
    if (!customer.birthday) missing.push('birthday')
    
    return missing
  }

  // 🔧 HELPER: Agrupar por campo
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = item[key] as string
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  // 🎂 HELPER: Procesar cumpleaños por business
  private async processBirthdayCustomersForBusiness(businessId: string, customers: Customer[]): Promise<void> {
    console.log(`🏢 Procesando ${customers.length} cumpleaños para business: ${businessId}`)

    // Obtener automatizaciones de cumpleaños para este business
    const { data: automations, error } = await this.supabase
      .from('automations')
      .select('*')
      .eq('business_id', businessId)
      .eq('automation_type', 'birthday')
      .eq('is_active', true)

    if (error || !automations) {
      console.log(`No hay automatizaciones de cumpleaños para business: ${businessId}`)
      return
    }

    // Enviar mensaje a cada cliente
    for (const customer of customers) {
      for (const automation of automations) {
        if (automation.trigger_days === 7 || automation.trigger_days === null) {
          // Solo enviar recordatorio (7 días antes)
          await this.sendBirthdayMessage(customer, automation)
        }
      }
    }
  }

  // 💤 HELPER: Procesar automatización de inactivos
  private async processInactiveCustomersForAutomation(automation: Automation): Promise<void> {
    const daysAgo = automation.trigger_days || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    // Query optimizada: Solo clientes de este business inactivos
    const { data: customers, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('business_id', automation.business_id)
      .not('phone', 'is', null)
      .lt('last_interaction', cutoffDate.toISOString())

    if (error || !customers || customers.length === 0) {
      console.log(`No hay clientes inactivos para business: ${automation.business_id}`)
      return
    }

    // Filtrar por audiencia objetivo
    let targetCustomers = customers
    if (automation.target_audience === 'low_visits') {
      targetCustomers = customers.filter(c => (c.visit_count || 0) <= 3)
    } else if (automation.target_audience === 'high_visits') {
      targetCustomers = customers.filter(c => (c.visit_count || 0) >= 4)
    }

    console.log(`📨 Enviando a ${targetCustomers.length} clientes inactivos (audiencia: ${automation.target_audience})`)

    for (const customer of targetCustomers) {
      await this.sendInactiveCustomerMessage(customer, automation)
    }
  }

  // 📱 HELPER: Enviar mensaje de cumpleaños
  private async sendBirthdayMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`🎂 Enviando mensaje de cumpleaños a: ${customer.name} (${customer.phone})`)

      // Obtener promoción
      let promotion = null
      if (automation.promotion_id) {
        const { data: promoData } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (promoData) promotion = promoData
      }

      // Obtener puntos de cumpleaños
      const { data: loyaltySettings } = await this.supabase
        .from('loyalty_settings')
        .select('birthday_bonus_points')
        .eq('business_id', automation.business_id)
        .single()

      const pointsReward = loyaltySettings?.birthday_bonus_points?.toString() || '100'

      // Construir texto de promoción
      let promotionText = '🎂 Celebración especial de cumpleaños'
      if (promotion) {
        promotionText = promotion.title
        if (promotion.description) promotionText += ` - ${promotion.description}`
        if (promotion.discount_percentage) promotionText += ` (${promotion.discount_percentage}% descuento)`
      }

      // Enviar template
      const templateName = 'birthday_reminder'
      const parameters = [
        customer.name, // {{1}} Header
        promotionText, // {{1}} Body
        pointsReward   // {{2}} Body
      ]

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Mensaje de cumpleaños enviado a ${customer.name}`)
        await this.logAutomation(automation.id, customer.id, 'birthday', 'sent', `Birthday reminder sent`)
      } else {
        console.log(`❌ Error enviando mensaje a ${customer.name}:`, result?.message)
        await this.logAutomation(automation.id, customer.id, 'birthday', 'failed', `Error: ${result?.message}`)
      }

    } catch (error) {
      console.error(`Error enviando mensaje de cumpleaños a ${customer.name}:`, error)
      await this.logAutomation(automation.id, customer.id, 'birthday', 'error', `Error: ${error}`)
    }
  }

  // 📱 HELPER: Enviar mensaje de campo faltante
  private async sendMissingFieldMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`📝 Enviando solicitud de ${automation.missing_field_type} a: ${customer.name}`)

      const fieldNames: { [key: string]: string } = {
        birthday: 'fecha de cumpleaños',
        email: 'correo electrónico',
        instagram_username: 'usuario de Instagram',
        name: 'nombre completo'
      }

      const missingFieldText = fieldNames[automation.missing_field_type || ''] || 'información de contacto'
      const rewardText = automation.points_reward?.toString() || '25'

      const templateName = 'missing_data_request'
      const parameters = [
        customer.name || 'Cliente', // {{1}}
        missingFieldText,           // {{2}}
        rewardText                  // {{3}}
      ]

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Solicitud de ${automation.missing_field_type} enviada a ${customer.name}`)
        await this.logAutomation(automation.id, customer.id, 'missing_field', 'sent', `Missing field request: ${automation.missing_field_type}`)
      } else {
        console.log(`❌ Error enviando solicitud a ${customer.name}:`, result?.message)
        await this.logAutomation(automation.id, customer.id, 'missing_field', 'failed', `Error: ${result?.message}`)
      }

    } catch (error) {
      console.error(`Error enviando solicitud de campo a ${customer.name}:`, error)
      await this.logAutomation(automation.id, customer.id, 'missing_field', 'error', `Error: ${error}`)
    }
  }

  // 📱 HELPER: Enviar mensaje de cliente inactivo
  private async sendInactiveCustomerMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`💤 Enviando mensaje de reactivación a: ${customer.name}`)

      // Obtener promoción si está configurada
      let promotion = null
      if (automation.promotion_id) {
        const { data: promoData } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (promoData) promotion = promoData
      }

      // Determinar template por tipo de cliente
      const isVipCustomer = (customer.visit_count || 0) >= 4
      const templateName = isVipCustomer ? 'inactive_customer_vip' : 'inactive_customer_vip' // Usar el mismo por ahora

      // Construir texto de promoción
      let promotionText = isVipCustomer ? '🍺 Descuento VIP exclusivo' : '🎯 Oferta especial'
      if (promotion) {
        promotionText = promotion.title
        if (promotion.description) promotionText += ` - ${promotion.description}`
        if (promotion.discount_percentage) promotionText += ` (${promotion.discount_percentage}% descuento)`
      }

      const parameters = [
        customer.name, // {{1}} Header
        promotionText  // {{1}} Body
      ]

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Mensaje de reactivación enviado a ${customer.name}`)
        await this.logAutomation(automation.id, customer.id, 'inactive_customers', 'sent', `Reactivation message sent`)
      } else {
        console.log(`❌ Error enviando mensaje a ${customer.name}:`, result?.message)
        await this.logAutomation(automation.id, customer.id, 'inactive_customers', 'failed', `Error: ${result?.message}`)
      }

    } catch (error) {
      console.error(`Error enviando mensaje de reactivación a ${customer.name}:`, error)
      await this.logAutomation(automation.id, customer.id, 'inactive_customers', 'error', `Error: ${error}`)
    }
  }

  // 📝 HELPER: Log de automatización
  private async logAutomation(
    automationId: string,
    customerId: string,
    type: string,
    status: string,
    message: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('automation_logs')
        .insert([{
          automation_id: automationId,
          customer_id: customerId,
          message_sent: `Event-Driven: ${message}`,
          status: status
        }])
    } catch (error) {
      console.error('Error logging automation:', error)
    }
  }
}