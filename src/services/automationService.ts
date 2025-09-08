import { createClient } from '@supabase/supabase-js'
import { WhatsAppBusinessApiService } from './whatsappBusinessApi'

interface Customer {
  id: string
  name: string
  phone: string
  birthday?: string
  email?: string
  business_id: string
  visit_count?: number
  last_interaction?: string
  points?: number
  created_at?: string
}

interface Automation {
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
}

interface Promotion {
  id: string
  title: string
  description: string
  discount_percentage?: number
  points_reward?: number
  flyer_image_url?: string
}

export class AutomationService {
  private supabase
  private whatsapp: WhatsAppBusinessApiService

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.whatsapp = new WhatsAppBusinessApiService()
  }

  // Main method to process all types of automations
  async processAllAutomations(): Promise<void> {
    console.log('🤖 Procesando todas las automatizaciones...')
    
    await Promise.all([
      this.processBirthdayAutomations(),
      this.processInactiveCustomersAutomations(),
      // ⭐ Points notifications are now AUTOMATIC when points are loaded
      // this.processPointsNotificationAutomations(),
      this.processMissingFieldsAutomations()
    ])
  }

  // Process automations for a specific business
  async processBusinessAutomations(businessId: string): Promise<void> {
    console.log(`🏢 Procesando automatizaciones para business: ${businessId}`)
    
    await Promise.all([
      this.processBirthdayAutomationsByBusiness(businessId),
      this.processInactiveCustomersAutomationsByBusiness(businessId),
      // ⭐ Points notifications are now AUTOMATIC when points are loaded
      // this.processPointsNotificationAutomationsByBusiness(businessId),
      this.processMissingFieldsAutomationsByBusiness(businessId)
    ])
  }

  async processBirthdayAutomations(): Promise<void> {
    console.log('🎂 Procesando automatizaciones de cumpleaños...')

    try {
      // Get all active birthday automations
      const { data: automations, error: automationError } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'birthday')
        .eq('is_active', true)

      if (automationError) {
        console.error('Error loading birthday automations:', automationError)
        return
      }

      if (!automations || automations.length === 0) {
        console.log('No hay automatizaciones de cumpleaños activas')
        return
      }

      console.log(`Encontradas ${automations.length} automatizaciones de cumpleaños activas`)

      // Process each automation
      for (const automation of automations) {
        await this.processSingleBirthdayAutomation(automation)
      }

    } catch (error) {
      console.error('Error procesando automatizaciones de cumpleaños:', error)
    }
  }

  private async processSingleBirthdayAutomation(automation: Automation): Promise<void> {
    console.log(`📅 Procesando automatización: ${automation.name}`)

    try {
      // Calculate target date (today + trigger_days)
      const today = new Date()
      const targetDate = new Date(today)
      const triggerDays = automation.trigger_days ?? 7 // Usar ?? en lugar de ||
      targetDate.setDate(today.getDate() + triggerDays)

      // Format date as MM-DD for birthday comparison
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
      const targetDay = String(targetDate.getDate()).padStart(2, '0')
      const birthdayFilter = `${targetMonth}-${targetDay}`

      console.log(`🔍 Buscando cumpleaños para: ${birthdayFilter} (en ${triggerDays} días)`)

      // Get customers with birthdays on target date
      const { data: customers, error: customerError } = await this.supabase
        .from('customers')
        .select('*')
        .eq('business_id', automation.business_id)
        .not('birthday', 'is', null)
        .not('phone', 'is', null)

      if (customerError) {
        console.error('Error loading customers:', customerError)
        return
      }

      if (!customers || customers.length === 0) {
        console.log('No hay clientes con cumpleaños configurados')
        return
      }

      // Filter customers with matching birthday
      const birthdayCustomers = customers.filter(customer => {
        if (!customer.birthday) return false
        
        // Extract month-day from birthday (assuming YYYY-MM-DD format)
        // Use string parsing to avoid timezone issues
        const birthdayParts = customer.birthday.split('-')
        const customerMonth = birthdayParts[1]
        const customerDay = birthdayParts[2]
        const customerBirthday = `${customerMonth}-${customerDay}`
        
        console.log(`🔍 Cliente: ${customer.name}, Birthday: ${customer.birthday}, Parsed: ${customerBirthday}, Target: ${birthdayFilter}`)
        
        return customerBirthday === birthdayFilter
      })

      console.log(`🎯 Encontrados ${birthdayCustomers.length} clientes con cumpleaños en la fecha objetivo`)

      // Process each birthday customer
      for (const customer of birthdayCustomers) {
        await this.sendBirthdayMessage(customer, automation)
      }

    } catch (error) {
      console.error(`Error procesando automatización ${automation.name}:`, error)
    }
  }

  private async sendBirthdayMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`🎂 Enviando mensaje de cumpleaños a: ${customer.name} (${customer.phone})`)

      // Get promotion if assigned
      let promotion: Promotion | null = null
      if (automation.promotion_id) {
        console.log(`🎁 Obteniendo promoción ID: ${automation.promotion_id}`)
        const { data: promoData, error: promoError } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (!promoError && promoData) {
          promotion = promoData
          console.log(`✅ Promoción encontrada: ${promoData.title}`)
        } else {
          console.log(`❌ No se encontró promoción activa con ID: ${automation.promotion_id}`)
        }
      }

      // Build promotion text and get birthday points from loyalty settings
      let promotionText = '🎂 Celebración especial de cumpleaños'
      let pointsReward = '100' // Default fallback

      // Get birthday points from loyalty settings
      const { data: loyaltySettings, error: loyaltyError } = await this.supabase
        .from('loyalty_settings')
        .select('birthday_bonus_points')
        .eq('business_id', automation.business_id)
        .single()

      if (!loyaltyError && loyaltySettings?.birthday_bonus_points) {
        pointsReward = loyaltySettings.birthday_bonus_points.toString()
        console.log(`🎂 Puntos de cumpleaños configurados: ${pointsReward}`)
      } else {
        console.log('⚠️ No se encontraron puntos de cumpleaños configurados, usando 100 por defecto')
      }

      if (promotion) {
        promotionText = promotion.title
        if (promotion.description) {
          promotionText += ` - ${promotion.description}`
        }
        if (promotion.discount_percentage) {
          promotionText += ` (${promotion.discount_percentage}% descuento)`
        }
        // Los puntos de cumpleaños se mantienen desde loyalty_settings
      }

      // **SI ES EL DÍA EXACTO DEL CUMPLEAÑOS (trigger_days = 0), SOLO OTORGAR PUNTOS SIN ENVIAR MENSAJE**
      if (automation.trigger_days === 0) {
        console.log(`🎂 Es el día del cumpleaños de ${customer.name}, otorgando puntos...`)
        await this.awardBirthdayPoints(customer, automation.business_id, parseInt(pointsReward))
        await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'points_awarded', `Points awarded: ${pointsReward}`)
        return // No enviar mensaje para puntos de cumpleaños
      }

      // **SOLO ENVIAR MENSAJE SI NO ES EL DÍA EXACTO (trigger_days > 0)**
      // Send WhatsApp template message
      const templateName = 'birthday_reminder'
      const parameters = [
        customer.name, // {{1}} Header: nombre del cliente
        promotionText, // {{1}} Body: promocion especial
        pointsReward // {{2}} Body: puntos de regalo
      ]

      console.log(`🎂 Enviando plantilla ${templateName} a ${customer.name} (${customer.phone})`)
      console.log(`📋 Parámetros:`, parameters)
      console.log(`🎁 Promoción aplicada:`, promotion ? promotion.title : 'Promoción por defecto')

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Plantilla ${templateName} enviada exitosamente a ${customer.name}`)
        console.log(`📅 Mensaje enviado ${automation.trigger_days} días antes del cumpleaños. Los puntos se otorgarán el día exacto.`)
        
        // Log the automation execution
        await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'sent', `Template: ${templateName} | Promotion: ${promotion?.title || 'Default'} | Reminder sent`)
      } else {
        console.log(`❌ Error enviando plantilla a ${customer.name}:`, result?.message || 'Error desconocido')
        await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'failed', `Template: ${templateName} - Error: ${result?.message || 'Unknown error'}`)
      }

    } catch (error) {
      console.error(`Error enviando mensaje a ${customer.name}:`, error)
      await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'error', `Error: ${error}`)
    }
  }

  private async logAutomationExecution(
    automationId: string,
    customerId: string,
    triggerType: string,
    status: string,
    messageContent: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('automation_logs')
        .insert([{
          automation_id: automationId,
          customer_id: customerId,
          message_sent: messageContent,
          status: status,
          sent_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Error logging automation execution:', error)
    }
  }

  // Process inactive customers automation
  async processInactiveCustomersAutomations(): Promise<void> {
    console.log('💤 Procesando automatizaciones de clientes inactivos...')

    try {
      const { data: automations, error: automationError } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'inactive_customers')
        .eq('is_active', true)

      if (automationError || !automations || automations.length === 0) {
        console.log('No hay automatizaciones de clientes inactivos activas')
        return
      }

      for (const automation of automations) {
        await this.processSingleInactiveCustomersAutomation(automation)
      }
    } catch (error) {
      console.error('Error procesando automatizaciones de clientes inactivos:', error)
    }
  }

  private async processSingleInactiveCustomersAutomation(automation: Automation): Promise<void> {
    console.log(`💤 Procesando automatización: ${automation.name}`)

    try {
      const daysAgo = automation.trigger_days || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

      // Get customers who haven't interacted recently
      const { data: customers, error: customerError } = await this.supabase
        .from('customers')
        .select('*')
        .eq('business_id', automation.business_id)
        .not('phone', 'is', null)
        .lt('last_interaction', cutoffDate.toISOString())

      if (customerError || !customers || customers.length === 0) {
        console.log('No hay clientes inactivos para contactar')
        return
      }

      console.log(`📊 Encontrados ${customers.length} clientes inactivos`)

      // Filter based on target audience
      let targetCustomers = customers
      if (automation.target_audience === 'low_visits') {
        // Customers with 1-3 visits (new customers)
        targetCustomers = customers.filter(c => (c.visit_count || 0) <= 3)
      } else if (automation.target_audience === 'high_visits') {
        // Customers with 4+ visits (VIP customers)
        targetCustomers = customers.filter(c => (c.visit_count || 0) >= 4)
      }

      console.log(`🎯 Enviando a ${targetCustomers.length} clientes de audiencia: ${automation.target_audience}`)

      for (const customer of targetCustomers) {
        await this.sendInactiveCustomerMessage(customer, automation)
      }
    } catch (error) {
      console.error(`Error procesando automatización ${automation.name}:`, error)
    }
  }

  private async sendInactiveCustomerMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`💤 Enviando mensaje de reactivación a: ${customer.name} (${customer.phone})`)

      // Get promotion if assigned
      let promotion: Promotion | null = null
      if (automation.promotion_id) {
        console.log(`🎁 Obteniendo promoción ID: ${automation.promotion_id}`)
        const { data: promoData } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (promoData) {
          promotion = promoData
          console.log(`✅ Promoción encontrada: ${promoData.title}`)
        }
      }

      // Determine template based on customer visit count
      const isVipCustomer = (customer.visit_count || 0) >= 4
      const templateName = isVipCustomer ? 'inactive_customer_vip' : 'inactive_customer_new'
      
      // Build promotion text
      let promotionText = isVipCustomer ? '🍺 Descuento VIP exclusivo' : '🎯 Oferta especial para nuevos clientes'

      if (promotion) {
        promotionText = promotion.title
        if (promotion.description) {
          promotionText += ` - ${promotion.description}`
        }
        if (promotion.discount_percentage) {
          promotionText += ` (${promotion.discount_percentage}% descuento)`
        }
      }
      
      const parameters = [
        customer.name, // {{1}} Header: nombre del cliente
        promotionText // {{1}} Body: promocion especial
      ]

      console.log(`💤 Enviando plantilla ${templateName} a ${customer.name} (${customer.phone})`)
      console.log(`📋 Parámetros:`, parameters)
      console.log(`🎁 Promoción aplicada:`, promotion ? promotion.title : 'Promoción por defecto')

      // Send WhatsApp template message
      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Plantilla ${templateName} enviada exitosamente a ${customer.name}`)
        await this.logAutomationExecution(automation.id, customer.id, 'inactive_customers', 'sent', `Template: ${templateName} | Promotion: ${promotion?.title || 'Default'}`)
      } else {
        console.log(`❌ Error enviando plantilla a ${customer.name}:`, result?.message || 'Error desconocido')
        await this.logAutomationExecution(automation.id, customer.id, 'inactive_customers', 'failed', `Template: ${templateName} - Error: ${result?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error enviando plantilla de reactivación a ${customer.name}:`, error)
      const templateName = (customer.visit_count || 0) >= 4 ? 'inactive_customer_vip' : 'inactive_customer_new'
      await this.logAutomationExecution(automation.id, customer.id, 'inactive_customers', 'error', `Template: ${templateName} - Error: ${error}`)
    }
  }

  // Process points notification automation
  async processPointsNotificationAutomations(): Promise<void> {
    console.log('⭐ Procesando automatizaciones de notificación de puntos...')

    try {
      const { data: automations, error } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'points_notification')
        .eq('is_active', true)

      if (error || !automations || automations.length === 0) {
        console.log('No hay automatizaciones de notificación de puntos activas')
        return
      }

      for (const automation of automations) {
        await this.processSinglePointsNotificationAutomation(automation)
      }
    } catch (error) {
      console.error('Error procesando automatizaciones de puntos:', error)
    }
  }

  private async processSinglePointsNotificationAutomation(automation: Automation): Promise<void> {
    console.log(`⭐ Procesando automatización: ${automation.name}`)

    try {
      // Get recent point loads (last hour for immediate notifications)
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data: pointLoads, error } = await this.supabase
        .from('point_loads')
        .select(`
          *,
          customers:customer_id (
            id, name, phone, points, business_id
          )
        `)
        .eq('business_id', automation.business_id)
        .gte('created_at', oneHourAgo.toISOString())

      if (error || !pointLoads || pointLoads.length === 0) {
        console.log('No hay cargas de puntos recientes')
        return
      }

      console.log(`📊 Encontradas ${pointLoads.length} cargas de puntos recientes`)

      for (const pointLoad of pointLoads) {
        if (pointLoad.customers) {
          await this.sendPointsNotificationMessage(pointLoad.customers, pointLoad, automation)
        }
      }
    } catch (error) {
      console.error(`Error procesando automatización ${automation.name}:`, error)
    }
  }

  private async sendPointsNotificationMessage(customer: any, pointLoad: any, automation: Automation): Promise<void> {
    try {
      console.log(`⭐ Enviando notificación de puntos a: ${customer.name} (${customer.phone})`)

      // Get promotion if assigned
      let promotion: Promotion | null = null
      if (automation.promotion_id) {
        console.log(`🎁 Obteniendo promoción ID: ${automation.promotion_id}`)
        const { data: promoData } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (promoData) {
          promotion = promoData
          console.log(`✅ Promoción encontrada: ${promoData.title}`)
        }
      }

      // Get next redeemable item
      const { data: nextReward } = await this.supabase
        .from('redeemable_items')
        .select('*')
        .eq('business_id', customer.business_id)
        .eq('is_available', true)
        .gte('points_required', customer.points)
        .order('points_required', { ascending: true })
        .limit(1)
        .single()

      // Build reward text with promotion if available
      let rewardText = nextReward?.name || '⭐ Recompensas disponibles'
      
      if (promotion) {
        rewardText = promotion.title
        if (promotion.description) {
          rewardText += ` - ${promotion.description}`
        }
        if (promotion.discount_percentage) {
          rewardText += ` (${promotion.discount_percentage}% descuento)`
        }
      }

      // Send WhatsApp template message
      const templateName = 'points_notification'
      const parameters = [
        customer.name, // {{1}} nombre del cliente
        pointLoad.points_awarded?.toString() || '50', // {{2}} puntos que acaba de sumar
        rewardText // {{3}} recompensas disponibles o promoción
      ]

      console.log(`⭐ Enviando plantilla ${templateName} a ${customer.name} (${customer.phone})`)
      console.log(`📋 Parámetros:`, parameters)
      console.log(`🎁 Promoción aplicada:`, promotion ? promotion.title : 'Recompensa por defecto')

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Plantilla ${templateName} enviada exitosamente a ${customer.name}`)
        await this.logAutomationExecution(automation.id, customer.id, 'points_notification', 'sent', `Template: ${templateName} | Promotion: ${promotion?.title || 'Default'}`)
      } else {
        console.log(`❌ Error enviando plantilla a ${customer.name}:`, result?.message || 'Error desconocido')
        await this.logAutomationExecution(automation.id, customer.id, 'points_notification', 'failed', `Template: ${templateName} - Error: ${result?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error enviando plantilla de puntos a ${customer.name}:`, error)
      const templateName = 'points_notification'
      await this.logAutomationExecution(automation.id, customer.id, 'points_notification', 'error', `Template: ${templateName} - Error: ${error}`)
    }
  }

  // Process missing fields automation
  async processMissingFieldsAutomations(): Promise<void> {
    console.log('📝 Procesando automatizaciones de campos faltantes...')

    try {
      const { data: automations, error } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'missing_field')
        .eq('is_active', true)

      if (error || !automations || automations.length === 0) {
        console.log('No hay automatizaciones de campos faltantes activas')
        return
      }

      for (const automation of automations) {
        await this.processSingleMissingFieldsAutomation(automation)
      }
    } catch (error) {
      console.error('Error procesando automatizaciones de campos faltantes:', error)
    }
  }

  private async processSingleMissingFieldsAutomation(automation: Automation): Promise<void> {
    console.log(`📝 Procesando automatización: ${automation.name}`)

    try {
      const daysAgo = automation.trigger_days || 3
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

      // Build query based on missing field type
      let query = this.supabase
        .from('customers')
        .select('*')
        .eq('business_id', automation.business_id)
        .not('phone', 'is', null)
        .gte('created_at', cutoffDate.toISOString())

      // Filter by missing field
      if (automation.missing_field_type === 'birthday') {
        query = query.is('birthday', null)
      } else if (automation.missing_field_type === 'email') {
        query = query.is('email', null)
      } else if (automation.missing_field_type === 'instagram_username') {
        query = query.is('instagram_username', null)
      } else if (automation.missing_field_type === 'name') {
        query = query.is('name', null)
      }

      const { data: customers, error } = await query

      if (error || !customers || customers.length === 0) {
        console.log('No hay clientes con campos faltantes para contactar')
        return
      }

      console.log(`📊 Encontrados ${customers.length} clientes con campos faltantes`)

      for (const customer of customers) {
        await this.sendMissingFieldMessage(customer, automation)
      }
    } catch (error) {
      console.error(`Error procesando automatización ${automation.name}:`, error)
    }
  }

  private async sendMissingFieldMessage(customer: Customer, automation: Automation): Promise<void> {
    try {
      console.log(`📝 Enviando solicitud de datos a: ${customer.name || customer.phone}`)

      // Get promotion if assigned
      let promotion: Promotion | null = null
      if (automation.promotion_id) {
        console.log(`🎁 Obteniendo promoción ID: ${automation.promotion_id}`)
        const { data: promoData } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .eq('is_active', true)
          .single()

        if (promoData) {
          promotion = promoData
          console.log(`✅ Promoción encontrada: ${promoData.title}`)
        }
      }

      const fieldNames: { [key: string]: string } = {
        birthday: 'fecha de cumpleaños',
        email: 'correo electrónico',
        instagram_username: 'usuario de Instagram',
        name: 'nombre completo'
      }

      // Build reward text
      let rewardText = automation.points_reward?.toString() || '25'
      
      if (promotion && promotion.points_reward) {
        rewardText = promotion.points_reward.toString()
      }

      // Send WhatsApp template message
      const templateName = 'missing_data_request'
      const missingFieldText = fieldNames[automation.missing_field_type || ''] || 'información de contacto'
      
      const parameters = [
        customer.name || 'Cliente', // {{1}} nombre del cliente
        missingFieldText, // {{2}} campo faltante
        rewardText // {{3}} puntos de recompensa
      ]

      console.log(`📝 Enviando plantilla ${templateName} a ${customer.name || customer.phone}`)
      console.log(`📋 Parámetros:`, parameters)
      console.log(`🎁 Promoción aplicada:`, promotion ? promotion.title : 'Puntos por defecto')

      const result = await this.whatsapp.sendTemplateWithParameters(customer.phone, templateName, parameters)
      
      if (result && !result.error) {
        console.log(`✅ Plantilla ${templateName} enviada exitosamente a ${customer.name || customer.phone}`)
        await this.logAutomationExecution(automation.id, customer.id, 'missing_field', 'sent', `Template: ${templateName} | Promotion: ${promotion?.title || 'Default'}`)
      } else {
        console.log(`❌ Error enviando plantilla a ${customer.name || customer.phone}:`, result?.message || 'Error desconocido')
        await this.logAutomationExecution(automation.id, customer.id, 'missing_field', 'failed', `Template: ${templateName} - Error: ${result?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error enviando plantilla de datos faltantes a ${customer.name || customer.phone}:`, error)
      const templateName = 'missing_data_request'
      await this.logAutomationExecution(automation.id, customer.id, 'missing_field', 'error', `Template: ${templateName} - Error: ${error}`)
    }
  }

  async testBirthdayAutomation(customerPhoneNumber: string): Promise<void> {
    console.log(`🧪 Probando automatización de cumpleaños para: ${customerPhoneNumber}`)

    try {
      // Find customer by phone number
      const { data: customers, error: customerError } = await this.supabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${customerPhoneNumber}%`)

      if (customerError || !customers || customers.length === 0) {
        console.log('❌ Cliente no encontrado')
        return
      }

      const customer = customers[0]
      console.log(`👤 Cliente encontrado: ${customer.name}`)

      // Find active birthday automation for this business
      const { data: automations, error: automationError } = await this.supabase
        .from('automations')
        .select('*')
        .eq('business_id', customer.business_id)
        .eq('automation_type', 'birthday')
        .eq('is_active', true)

      if (automationError || !automations || automations.length === 0) {
        console.log('❌ No hay automatizaciones de cumpleaños activas')
        return
      }

      const automation = automations[0]
      console.log(`🤖 Automatización encontrada: ${automation.name}`)

      // Send test message
      await this.sendBirthdayMessage(customer, automation)

    } catch (error) {
      console.error('Error en prueba de automatización:', error)
    }
  }

  // Función para otorgar puntos de cumpleaños
  private async awardBirthdayPoints(customer: Customer, businessId: string, pointsToAward: number): Promise<void> {
    try {
      // Verificar si ya se otorgaron puntos de cumpleaños este año
      const currentYear = new Date().getFullYear()
      const { data: existingPoints, error: checkError } = await this.supabase
        .from('point_loads')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('description', `Puntos de cumpleaños ${currentYear}`)
        .single()

      if (!checkError && existingPoints) {
        console.log(`🎂 Puntos de cumpleaños ${currentYear} ya otorgados a ${customer.name}`)
        return
      }

      // Obtener puntos actuales del cliente
      const currentPoints = customer.points || 0
      const newTotalPoints = currentPoints + pointsToAward

      // Actualizar puntos del cliente
      const { error: updateError } = await this.supabase
        .from('customers')
        .update({ 
          points: newTotalPoints,
          last_interaction: new Date().toISOString()
        })
        .eq('id', customer.id)

      if (updateError) {
        console.error('Error updating customer points:', updateError)
        return
      }

      // Registrar la carga de puntos
      const { error: pointLoadError } = await this.supabase
        .from('point_loads')
        .insert({
          business_id: businessId,
          customer_id: customer.id,
          customer_phone: customer.phone,
          amount_spent: 0,
          points_awarded: pointsToAward,
          loaded_by: null
        })

      if (pointLoadError) {
        console.error('Error recording birthday points:', pointLoadError)
        return
      }

      console.log(`🎉 Puntos de cumpleaños otorgados: ${pointsToAward} puntos a ${customer.name} (${currentPoints} → ${newTotalPoints})`)

    } catch (error) {
      console.error('Error awarding birthday points:', error)
    }
  }

  // Business-specific automation methods
  async processBirthdayAutomationsByBusiness(businessId: string): Promise<void> {
    console.log(`🎂 Procesando automatizaciones de cumpleaños para business: ${businessId}`)

    try {
      const { data: automations, error: automationError } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'birthday')
        .eq('is_active', true)
        .eq('business_id', businessId)

      if (automationError) {
        console.error('Error loading birthday automations:', automationError)
        return
      }

      if (!automations || automations.length === 0) {
        console.log(`No hay automatizaciones de cumpleaños activas para business: ${businessId}`)
        return
      }

      console.log(`Encontradas ${automations.length} automatizaciones de cumpleaños activas para business: ${businessId}`)

      for (const automation of automations) {
        await this.processSingleBirthdayAutomation(automation)
      }

    } catch (error) {
      console.error(`Error procesando automatizaciones de cumpleaños para business ${businessId}:`, error)
    }
  }

  async processInactiveCustomersAutomationsByBusiness(businessId: string): Promise<void> {
    console.log(`💤 Procesando automatizaciones de clientes inactivos para business: ${businessId}`)

    try {
      const { data: automations, error: automationError } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'inactive_customers')
        .eq('is_active', true)
        .eq('business_id', businessId)

      if (automationError || !automations || automations.length === 0) {
        console.log(`No hay automatizaciones de clientes inactivos activas para business: ${businessId}`)
        return
      }

      for (const automation of automations) {
        await this.processSingleInactiveCustomersAutomation(automation)
      }
    } catch (error) {
      console.error(`Error procesando automatizaciones de clientes inactivos para business ${businessId}:`, error)
    }
  }

  async processPointsNotificationAutomationsByBusiness(businessId: string): Promise<void> {
    console.log(`⭐ Procesando automatizaciones de notificación de puntos para business: ${businessId}`)

    try {
      const { data: automations, error } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'points_notification')
        .eq('is_active', true)
        .eq('business_id', businessId)

      if (error || !automations || automations.length === 0) {
        console.log(`No hay automatizaciones de notificación de puntos activas para business: ${businessId}`)
        return
      }

      for (const automation of automations) {
        await this.processSinglePointsNotificationAutomation(automation)
      }
    } catch (error) {
      console.error(`Error procesando automatizaciones de puntos para business ${businessId}:`, error)
    }
  }

  async processMissingFieldsAutomationsByBusiness(businessId: string): Promise<void> {
    console.log(`📝 Procesando automatizaciones de campos faltantes para business: ${businessId}`)

    try {
      const { data: automations, error } = await this.supabase
        .from('automations')
        .select('*')
        .eq('automation_type', 'missing_field')
        .eq('is_active', true)
        .eq('business_id', businessId)

      if (error || !automations || automations.length === 0) {
        console.log(`No hay automatizaciones de campos faltantes activas para business: ${businessId}`)
        return
      }

      for (const automation of automations) {
        await this.processSingleMissingFieldsAutomation(automation)
      }
    } catch (error) {
      console.error(`Error procesando automatizaciones de campos faltantes para business ${businessId}:`, error)
    }
  }
}