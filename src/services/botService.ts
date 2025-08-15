import { createClient } from '@supabase/supabase-js'
import { EvolutionApiService } from './evolutionApi'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface BotPersonality {
  id: string
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

export interface BusinessInfo {
  id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  working_hours?: any
  categories?: string[]
  specialties?: string[]
}

export class BotService {
  private evolutionApi: EvolutionApiService

  constructor() {
    this.evolutionApi = new EvolutionApiService()
  }

  async processMessage(instanceName: string, customerNumber: string, messageText: string): Promise<string> {
    try {
      // Get business info from instance name (you may need to store this mapping in database)
      const businessId = await this.getBusinessIdFromInstance(instanceName)
      if (!businessId) {
        return 'Lo siento, no pude procesar tu mensaje en este momento.'
      }

      // Get bot personality and business info
      const [botPersonality, businessInfo] = await Promise.all([
        this.getBotPersonality(businessId),
        this.getBusinessInfo(businessId)
      ])

      if (!botPersonality || !businessInfo) {
        return 'Lo siento, el servicio no está disponible en este momento.'
      }

      // Check if business is open
      if (!this.isBusinessOpen(businessInfo.working_hours)) {
        return botPersonality.out_of_hours_message
      }

      // Generate response based on message
      const response = this.generateResponse(messageText, botPersonality, businessInfo, customerNumber)
      
      // Log conversation (optional)
      await this.logConversation(businessId, customerNumber, messageText, response)
      
      return response
    } catch (error: any) {
      console.error('Error processing message:', error)
      return 'Disculpa, ocurrió un error. Por favor intenta nuevamente.'
    }
  }

  private async getBotPersonality(businessId: string): Promise<BotPersonality | null> {
    try {
      const { data, error } = await supabase
        .from('bot_personalities')
        .select('*')
        .eq('business_id', businessId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error getting bot personality:', error)
      return null
    }
  }

  private async getBusinessInfo(businessId: string): Promise<BusinessInfo | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error getting business info:', error)
      return null
    }
  }

  private async getBusinessIdFromInstance(instanceName: string): Promise<string | null> {
    try {
      // You might store instance -> business mapping in database
      // For now, we'll extract it from instance name pattern: "business-{id}-bot"
      const match = instanceName.match(/business-(.+)-bot/)
      return match?.[1] ?? null
    } catch (error: any) {
      console.error('Error getting business ID from instance:', error)
      return null
    }
  }

  private isBusinessOpen(workingHours: any): boolean {
    if (!workingHours) return true // Default to open if no hours configured

    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().slice(0, 3) // mon, tue, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight

    const dayHours = workingHours[currentDay]
    if (!dayHours || dayHours.closed) return false

    const openTime = this.timeToMinutes(dayHours.open)
    const closeTime = this.timeToMinutes(dayHours.close)

    return currentTime >= openTime && currentTime <= closeTime
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  private generateResponse(input: string, personality: BotPersonality, business: BusinessInfo, _customerNumber: string): string {
    const lowerInput = input.toLowerCase()

    // Welcome keywords
    if (lowerInput.includes('hola') || lowerInput.includes('buenas') || lowerInput.includes('buenos días') || lowerInput.includes('buenas tardes')) {
      return personality.welcome_message
    }

    // Reservations
    if (lowerInput.includes('reserva') || lowerInput.includes('mesa') || lowerInput.includes('booking')) {
      if (personality.capabilities.includes('reservas')) {
        return `¡Perfecto! Puedo ayudarte con reservas en ${business.name}. Tenemos disponibilidad para cena y baile. ¿Para qué fecha y cuántas personas necesitas la reserva? También puedes llamarnos al ${business.phone || 'nuestro teléfono'} para confirmar al instante.`
      }
    }

    // Business hours
    if (lowerInput.includes('horario') || lowerInput.includes('hora') || lowerInput.includes('abierto') || lowerInput.includes('cerrado')) {
      const hours = business.working_hours
      if (hours) {
        let response = `Nuestros horarios de atención son:\n`
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        
        days.forEach((day, index) => {
          const dayHours = hours[day]
          if (dayHours?.closed) {
            response += `📅 ${dayNames[index]}: Cerrado\n`
          } else if (dayHours?.open && dayHours?.close) {
            response += `📅 ${dayNames[index]}: ${dayHours.open} - ${dayHours.close}\n`
          }
        })
        return response
      } else {
        return `Para conocer nuestros horarios, puedes contactarnos al ${business.phone || 'nuestro teléfono'}.`
      }
    }

    // Location
    if (lowerInput.includes('ubicacion') || lowerInput.includes('direccion') || lowerInput.includes('donde') || lowerInput.includes('como llegar')) {
      return `📍 Nos encontramos en: ${business.address || 'Consulta nuestra dirección llamando al teléfono'}\n📞 Teléfono: ${business.phone || 'Teléfono no configurado'}`
    }

    // Loyalty points
    if (lowerInput.includes('puntos') || lowerInput.includes('fidelidad') || lowerInput.includes('loyalty')) {
      if (personality.capabilities.includes('puntos')) {
        return `🎁 ¡Tenemos un increíble programa de fidelidad! Ganas puntos con cada consumo y puedes canjearlos por descuentos y beneficios especiales. Para consultar tus puntos, proporciónanos tu número de teléfono o nombre.`
      }
    }

    // Menu
    if (lowerInput.includes('menu') || lowerInput.includes('comida') || lowerInput.includes('carta') || lowerInput.includes('platos')) {
      return `🍽️ Tenemos una deliciosa carta con especialidades de la casa. ${business.specialties?.length ? `Nuestras especialidades incluyen: ${business.specialties.join(', ')}.` : ''} Te recomiendo visitarnos para que puedas disfrutar de todas nuestras opciones o hacer una reserva.`
    }

    // Prices
    if (lowerInput.includes('precio') || lowerInput.includes('costo') || lowerInput.includes('cuanto')) {
      return `💰 Los precios varían según lo que elijas. Para cenas, el promedio por persona está entre $15,000 - $25,000. Para eventos de baile, la entrada general es de $8,000. Para información más específica, no dudes en consultarnos.`
    }

    // Events
    if (lowerInput.includes('evento') || lowerInput.includes('baile') || lowerInput.includes('fiesta') || lowerInput.includes('show')) {
      return `🎉 ¡Organizamos eventos increíbles! Tenemos noches de baile, espectáculos y celebraciones especiales. ¿Te interesa algún tipo de evento en particular? Puedo darte más detalles.`
    }

    // Contact
    if (lowerInput.includes('contacto') || lowerInput.includes('telefono') || lowerInput.includes('llamar')) {
      return `📞 Puedes contactarnos:\n• Teléfono: ${business.phone || 'Consultar teléfono'}\n• Email: ${business.email || 'Consultar email'}\n• También puedes seguir escribiendo aquí, estoy para ayudarte.`
    }

    // Goodbye
    if (lowerInput.includes('gracias') || lowerInput.includes('chau') || lowerInput.includes('adiós') || lowerInput.includes('hasta luego')) {
      return personality.goodbye_message
    }

    // Default fallback
    return personality.fallback_message || `Disculpa, no entendí bien tu consulta. Puedo ayudarte con:\n• Reservas para cena y baile\n• Información sobre horarios y ubicación\n• Consultas sobre nuestro programa de puntos\n• Información sobre eventos\n\n¿En qué más puedo asistirte?`
  }

  private async logConversation(businessId: string, customerNumber: string, customerMessage: string, botResponse: string): Promise<void> {
    try {
      await supabase.from('conversation_logs').insert({
        business_id: businessId,
        customer_number: customerNumber,
        customer_message: customerMessage,
        bot_response: botResponse,
        timestamp: new Date().toISOString()
      })
    } catch (error: any) {
      console.error('Error logging conversation:', error)
      // Don't throw error, just log it
    }
  }

  async sendMessage(instanceName: string, customerNumber: string, message: string): Promise<boolean> {
    try {
      await this.evolutionApi.sendMessage(instanceName, customerNumber, message)
      return true
    } catch (error: any) {
      console.error('Error sending message via bot service:', error)
      return false
    }
  }
}