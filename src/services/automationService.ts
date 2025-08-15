import { createClient } from '@supabase/supabase-js'
import { WhatsAppBusinessApiService } from './whatsappBusinessApi'

interface Customer {
  id: string
  name: string
  phone: string
  birthday?: string
  business_id: string
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
      targetDate.setDate(today.getDate() + (automation.trigger_days || 7))

      // Format date as MM-DD for birthday comparison
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
      const targetDay = String(targetDate.getDate()).padStart(2, '0')
      const birthdayFilter = `${targetMonth}-${targetDay}`

      console.log(`🔍 Buscando cumpleaños para: ${birthdayFilter} (en ${automation.trigger_days || 7} días)`)

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
        const { data: promoData, error: promoError } = await this.supabase
          .from('promotions')
          .select('*')
          .eq('id', automation.promotion_id)
          .single()

        if (!promoError && promoData) {
          promotion = promoData
        }
      }

      // Build message text
      let message = automation.message_template
        .replace(/{name}/g, customer.name)
        .replace(/{customer_name}/g, customer.name)

      // Add promotion info if available
      if (promotion) {
        message += `\n\n🎁 ${promotion.title}\n${promotion.description}`
        
        if (promotion.discount_percentage) {
          message += `\n💰 ¡${promotion.discount_percentage}% de descuento especial!`
        }
        
        if (promotion.points_reward) {
          message += `\n⭐ Gana ${promotion.points_reward} puntos extras`
        }
      }

      // Send WhatsApp message
      const result = await this.whatsapp.sendMessage(customer.phone, message)
      
      if (result) {
        console.log(`✅ Mensaje enviado exitosamente a ${customer.name}`)
        
        // Log the automation execution
        await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'sent', message)
      } else {
        console.log(`❌ Error enviando mensaje a ${customer.name}`)
        await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'failed', message)
      }

    } catch (error) {
      console.error(`Error enviando mensaje a ${customer.name}:`, error)
      await this.logAutomationExecution(automation.id, customer.id, 'birthday', 'error', automation.message_template)
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
          trigger_type: triggerType,
          status: status,
          message_content: messageContent,
          sent_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Error logging automation execution:', error)
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
}