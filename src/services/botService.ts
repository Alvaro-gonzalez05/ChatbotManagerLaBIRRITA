import { createClient } from '@supabase/supabase-js'
import { MercadoPagoService } from './mercadoPagoService'

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/['"]/g, '')
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/['"]/g, '')
const supabase = createClient(supabaseUrl, supabaseKey)
const mercadoPagoService = new MercadoPagoService()

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
  instagram_url?: string
  location_url?: string
  transfer_alias?: string
  working_hours?: any
  categories?: string[]
  specialties?: string[]
}

export interface ConversationContext {
  id?: string
  customer_phone: string
  business_id: string
  customer_name?: string
  reservation_day?: string
  reservation_time?: string
  reservation_type?: string
  reservation_people?: number
  context_data?: any
  created_at?: string
  updated_at?: string
  expires_at?: string
}

export class BotService {
  constructor() {
    // No need for external dependencies
  }

  async processMessage(messageText: string, customerNumber: string, businessId: string, customerName?: string, transferNumber?: string | null): Promise<string> {
    try {
      // Get bot personality and business info
      const [botPersonality, businessInfo] = await Promise.all([
        this.getBotPersonality(businessId),
        this.getBusinessInfo(businessId)
      ])

      if (!botPersonality || !businessInfo) {
        return 'Lo siento, el servicio no está disponible en este momento.'
      }

      // Durante las pruebas, siempre responder normalmente
      // TODO: Descomentar cuando quieras activar horarios
      /*
      if (!this.isBusinessOpen(businessInfo.working_hours)) {
        return botPersonality.out_of_hours_message
      }
      */

      // Check if this is a name registration message for a new customer
      const isNameRegistration = this.isNameRegistrationMessage(messageText, customerName)
      if (isNameRegistration) {
        const extractedName = this.extractNameFromMessage(messageText)
        if (extractedName) {
          // Save new customer to database
          const customerId = await this.saveCustomer(customerNumber, extractedName, businessId)
          if (customerId) {
            return `¡Perfecto ${extractedName}! Ya te tengo registrado en nuestro sistema. ¿En qué te puedo ayudar hoy?`
          } else {
            return `¡Perfecto ${extractedName}! ¿En qué te puedo ayudar hoy?`
          }
        }
      }

      // Try to get customer name from database if not provided
      if (!customerName || customerName === 'Cliente') {
        try {
          const { data: customer } = await supabase
            .from('customers')
            .select('name')
            .eq('phone', customerNumber)
            .eq('business_id', businessId)
            .single()
          
          if (customer?.name) {
            customerName = customer.name
          }
        } catch (error) {
          // Customer not found, will use provided name or 'Cliente'
        }
      }

      // Get or create conversation context
      let context = await this.getConversationContext(customerNumber, businessId)

      // Check if this is a new conversation that should reset context
      if (this.isNewConversation(messageText, context)) {
        // Clear existing context for new conversation
        await this.clearConversationContext(customerNumber, businessId)
        context = null
      }

      // Generate response based on message and context
      console.log(`🤖 DEBUG: About to call generateResponse with transferNumber:`, transferNumber)
      const response = await this.generateResponse(messageText, botPersonality, businessInfo, customerNumber, customerName, context || undefined, transferNumber)
      
      // Update conversation context based on the interaction
      await this.updateConversationContext(customerNumber, businessId, messageText, customerName, context)
      
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


  private isBusinessOpen(workingHours: any): boolean {
    // Durante las pruebas, siempre consideramos que está abierto
    // TODO: Descomentar esta lógica cuando tengas horarios configurados
    return true
    
    /*
    if (!workingHours) return true // Default to open if no hours configured

    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase().slice(0, 3) // mon, tue, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight

    const dayHours = workingHours[currentDay]
    if (!dayHours || dayHours.closed) return false

    const openTime = this.timeToMinutes(dayHours.open)
    const closeTime = this.timeToMinutes(dayHours.close)

    return currentTime >= openTime && currentTime <= closeTime
    */
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  private async generateResponse(input: string, personality: BotPersonality, business: BusinessInfo, customerNumber: string, customerName?: string, context?: ConversationContext, transferNumber?: string | null): Promise<string> {
    const lowerInput = input.toLowerCase()

    // Extract name from message if mentioned
    let extractedName = customerName
    const nameMatch = input.match(/(?:soy|me\s+llamo|mi\s+nombre\s+es|a\s+nombre\s+de|nombre\s+de)\s+(\w+)|^(\w+)\s+(?:somos|soy)/i)
    if (nameMatch) {
      extractedName = nameMatch[1] || nameMatch[2]
      // Save the customer with extracted name
      this.saveCustomer(customerNumber, extractedName, business.id)
    }

    // Check if already greeted in this conversation
    const alreadyGreeted = context?.context_data?.greeted || false

    // *** PRIORITY CHECK: Transfer receipt detection (both text and transfer number) - MUST BE FIRST ***
    const hasTransferReceipt = this.isTransferReceipt(input, lowerInput) || (transferNumber !== null && transferNumber !== undefined)
    
    // DEBUG: Detailed logging
    console.log(`🔍 TRANSFER RECEIPT DEBUG:`)
    console.log(`   - Input: "${input}"`)
    console.log(`   - Lower: "${lowerInput}"`)
    console.log(`   - isTransferReceipt result: ${this.isTransferReceipt(input, lowerInput)}`)
    console.log(`   - transferNumber received:`, transferNumber)
    console.log(`   - hasTransferNumber: ${transferNumber !== null && transferNumber !== undefined}`)
    console.log(`   - hasTransferReceipt final: ${hasTransferReceipt}`)
    console.log(`   - Context exists: ${!!context}`)
    console.log(`   - Context reservation_day: ${context?.reservation_day}`)
    console.log(`   - Context reservation_people: ${context?.reservation_people}`)

    // Transfer receipt processing (HIGHEST PRIORITY)
    if (hasTransferReceipt) {
      console.log(`🔍 Processing transfer receipt with extracted name: ${extractedName}`)
      return await this.processTransferReceipt(input, business, customerNumber, extractedName, context, transferNumber)
    }

    // Use AI to detect intent and generate natural response
    const aiResponse = await this.generateAIResponse(input, personality, business, extractedName, alreadyGreeted, context)
    if (aiResponse) {
      return aiResponse
    }

    // Check for multiple intents in the same message (prioritize specific requests)
    const hasGreeting = lowerInput.includes('hola') || lowerInput.includes('buenas') || lowerInput.includes('buenos días') || lowerInput.includes('buenas tardes')
    
    // Enhanced reservation detection with multiple patterns FIRST
    const hasReservationKeywords = lowerInput.includes('reserva') || lowerInput.includes('mesa') || lowerInput.includes('booking')
    const hasReservationVerbs = lowerInput.includes('reservar') || lowerInput.includes('reservemos') || lowerInput.includes('reservo')
    const hasReservationIntent = (lowerInput.includes('quisiera') || lowerInput.includes('quiero') || lowerInput.includes('queremos') || lowerInput.includes('me gustaria')) && 
                               (hasReservationKeywords || hasReservationVerbs)
    const hasPositiveReservationResponse = (lowerInput.includes('dale') || lowerInput.includes('genial') || lowerInput.includes('perfecto') || lowerInput.includes('barbaro') || lowerInput.includes('bárbaro') || lowerInput.includes('si') || lowerInput.includes('sí')) &&
                                         (hasReservationKeywords || hasReservationVerbs || lowerInput.includes('reservemos') || lowerInput.includes('reserva'))
    const hasReservation = hasReservationKeywords || hasReservationVerbs || hasReservationIntent || hasPositiveReservationResponse
    
    // Hours request (but NOT if it's clearly a reservation with time)
    const hasHoursRequest = (lowerInput.includes('horario') || lowerInput.includes('abierto') || lowerInput.includes('cerrado') ||
                            (lowerInput.includes('hora') && !hasReservation)) // Only detect "hora" if it's not a reservation
    const hasLocationRequest = lowerInput.includes('ubicacion') || lowerInput.includes('direccion') || lowerInput.includes('donde') || lowerInput.includes('como llegar')
    const hasContactRequest = lowerInput.includes('contacto') || lowerInput.includes('telefono') || lowerInput.includes('llamar')
    const hasMenuRequest = lowerInput.includes('menu') || lowerInput.includes('comida') || lowerInput.includes('carta') || lowerInput.includes('platos')
    const hasLoyaltyRequest = (lowerInput.includes('puntos') || lowerInput.includes('fidelidad') || lowerInput.includes('loyalty')) && 
                             !lowerInput.includes('precio') && !lowerInput.includes('costo') && !lowerInput.includes('cuanto sale') && !lowerInput.includes('cuanto cuesta')
    const hasPriceRequest = (lowerInput.includes('precio') || lowerInput.includes('costo') || 
                           (lowerInput.includes('cuanto') && !lowerInput.includes('puntos'))) &&
                           !hasLoyaltyRequest
    
    console.log(`🔍 DEBUG: lowerInput="${lowerInput}", hasLoyaltyRequest=${hasLoyaltyRequest}, hasReservation=${hasReservation}, hasTransferReceipt=${hasTransferReceipt}, hasTransferNumber=${transferNumber !== null}`)
    const hasReservationDetails = this.isReservationDetails(lowerInput)

    // Check if already greeted in this conversation (avoid repeated greetings)
    // alreadyGreeted already declared above

    // PRIORITY ORDER: Specific requests take priority over greetings

    // Hours request (highest priority for information requests)
    if (hasHoursRequest) {
      const greetingPrefix = hasGreeting && !alreadyGreeted && extractedName ? `¡Hola ${extractedName}! ` : 
                           hasGreeting && !alreadyGreeted ? '¡Hola! ' : ''
      const response = this.generateBusinessHoursResponse(business)
      return greetingPrefix + response
    }

    // Location request
    if (hasLocationRequest) {
      const greetingPrefix = hasGreeting && !alreadyGreeted && extractedName ? `¡Hola ${extractedName}! ` : 
                           hasGreeting && !alreadyGreeted ? '¡Hola! ' : ''
      const response = `📍 **¡Acá estamos!**

🏠 ${business.address || 'Dirección no configurada'}
🗺️ Fácil de llegar

🚗 Tenemos estacionamiento propio
🚌 Llegás fácil en colectivo

¿Necesitás que te ayude con algo más?`
      return greetingPrefix + response
    }

    // Contact request  
    if (hasContactRequest) {
      const greetingPrefix = hasGreeting && !alreadyGreeted && extractedName ? `¡Hola ${extractedName}! ` : 
                           hasGreeting && !alreadyGreeted ? '¡Hola! ' : ''
      const response = `📞 **¡Contactanos cuando quieras!**

📱 WhatsApp: ${business.phone || 'No configurado'}
📧 Email: ${business.email || 'No configurado'}
📍 ${business.address || 'Dirección no configurada'}

También podés seguir escribiendo acá que te contesto al toque. ¿En qué más te ayudo?`
      return greetingPrefix + response
    }

    // Loyalty points request (before prices!)
    if (hasLoyaltyRequest) {
      console.log('🎯 Loyalty request detected for customer:', customerNumber)
      if (personality.capabilities.includes('puntos')) {
        console.log('🔍 Calling getLoyaltyPointsResponse...')
        // Try to get actual points if we have customer info
        const loyaltyResponse = await this.getLoyaltyPointsResponse(customerNumber, business.id)
        console.log('📊 Loyalty response received:', loyaltyResponse ? 'SUCCESS' : 'NULL')
        if (loyaltyResponse) {
          return loyaltyResponse
        }
        
        console.log('⚠️ Using fallback response - customer not found or error occurred')
        // Fallback if customer not found
        const response = `🎁 **¡Sos parte de nuestro club!**

Con cada consumo sumás puntos que podés canjear por:
• Descuentos en tu próxima visita
• Tragos gratis  
• Entradas sin cargo para el baile

¡Hacé tu reserva para venir al local y consultar tus puntos!`
        return response
      }
    }

    // Menu request
    if (hasMenuRequest) {
      const greetingPrefix = hasGreeting && !alreadyGreeted && extractedName ? `¡Hola ${extractedName}! ` : 
                           hasGreeting && !alreadyGreeted ? '¡Hola! ' : ''
      const response = `🍽️ **¡Nuestra carta está buenísima!**

🥩 Especialidades: Asados, parrilla, empanadas mendocinas
🍕 Pizzas artesanales con masa madre
🍸 Tragos de autor y cervezas artesanales
🧀 Picadas para compartir

¿Querés hacer una reserva para venir a probar? Te ayudo al toque.`
      return greetingPrefix + response
    }

    // Price request
    if (hasPriceRequest) {
      const greetingPrefix = hasGreeting && !alreadyGreeted && extractedName ? `¡Hola ${extractedName}! ` : 
                           hasGreeting && !alreadyGreeted ? '¡Hola! ' : ''
      const response = `💰 **Precios súper accesibles:**

🍽️ **Para cenar:** $15.000 - $30.000 por persona
🎉 **Entrada baile:** $8.000 (incluye un trago)
🍸 **Tragos:** desde $4.000
🍕 **Pizzas:** $8.000 - $12.000

¡Aceptamos efectivo, débito y crédito! ¿Hacemos la reserva?`
      return greetingPrefix + response
    }

    // If both greeting and reservation request, prioritize reservation but acknowledge greeting
    if (hasGreeting && (hasReservation || hasReservationDetails)) {
      if (!alreadyGreeted) {
        const greetingPrefix = extractedName ? `¡Hola ${extractedName}! ` : '¡Hola! '
        const presentation = `Soy ${personality.bot_name || 'el asistente'} de ${business.name}. `
        const reservationResponse = await this.processReservationDetails(input, business, customerNumber, extractedName, context)
        
        // If the reservation response starts with "¡Dale!" or similar, modify it to flow better
        if (reservationResponse.startsWith('¡Dale!') || reservationResponse.startsWith('¡Bárbaro!')) {
          return greetingPrefix + presentation + 'Dale, ' + reservationResponse.substring(reservationResponse.indexOf(' ') + 1)
        } else {
          return greetingPrefix + presentation + reservationResponse
        }
      } else {
        const reservationResponse = await this.processReservationDetails(input, business, customerNumber, extractedName, context)
        return reservationResponse
      }
    }

    // If only greeting and hasn't been greeted before
    if (hasGreeting && !alreadyGreeted) {
      const greeting = extractedName ? `¡Hola ${extractedName}! ` : '¡Hola! '
      return greeting + `Soy ${personality.bot_name || 'el asistente virtual'} de ${business.name}. ¿En qué te puedo ayudar hoy?`
    }

    // If only greeting but already greeted before, just acknowledge briefly
    if (hasGreeting && alreadyGreeted) {
      return `¡Hola de nuevo! ¿En qué más te puedo ayudar?`
    }

    // If reservation request without details
    if (hasReservation && !hasReservationDetails) {
      if (personality.capabilities.includes('reservas')) {
        return `¡Dale! Te ayudo con la reserva para ${business.name}. 

Para confirmar tu reserva necesito:
📅 ¿Para qué día la querés?
👥 ¿Cuántas personas van a ser?
🍽️ ¿Es para cenar o para el baile?

Decime los datos y te la confirmo al toque.`
      }
    }

    // Advanced reservation processing with specific details
    if (hasReservationDetails) {
      return await this.processReservationDetails(input, business, customerNumber, extractedName, context)
    }

    // Business hours
    if (lowerInput.includes('horario') || lowerInput.includes('hora') || lowerInput.includes('abierto') || lowerInput.includes('cerrado')) {
      return this.generateBusinessHoursResponse(business)
    }

    // Location
    if (lowerInput.includes('ubicacion') || lowerInput.includes('direccion') || lowerInput.includes('donde') || lowerInput.includes('como llegar')) {
      return `📍 **¡Acá estamos!**

🏠 ${business.address || 'Dirección no configurada'}
🗺️ Fácil de llegar

🚗 Tenemos estacionamiento propio
🚌 Llegás fácil en colectivo

¿Necesitás que te ayude con algo más?`
    }


    // Menu
    if (lowerInput.includes('menu') || lowerInput.includes('comida') || lowerInput.includes('carta') || lowerInput.includes('platos')) {
      return `🍽️ **¡Nuestra carta está buenísima!**

🥩 Especialidades: Asados, parrilla, empanadas mendocinas
🍕 Pizzas artesanales con masa madre
🍸 Tragos de autor y cervezas artesanales
🧀 Picadas para compartir

¿Querés hacer una reserva para venir a probar? Te ayudo al toque.`
    }

    // Prices
    if (lowerInput.includes('precio') || lowerInput.includes('costo') || lowerInput.includes('cuanto') || lowerInput.includes('valor')) {
      return `💰 **Precios súper accesibles:**

🍽️ **Para cenar:** $15.000 - $30.000 por persona
🎉 **Entrada baile:** $8.000 (incluye un trago)
🍸 **Tragos:** desde $4.000
🍕 **Pizzas:** $8.000 - $12.000

¡Aceptamos efectivo, débito y crédito! ¿Hacemos la reserva?`
    }

    // Events
    if (lowerInput.includes('evento') || lowerInput.includes('baile') || lowerInput.includes('fiesta') || lowerInput.includes('show')) {
      return `🎉 **¡Los findes son una locura acá!**

🎵 Viernes: Música en vivo + DJ
💃 Sábados: Noche de baile hasta las 4am
🎊 Eventos especiales todos los meses

¿Te copa venir este finde? Te hago la reserva ahora mismo.`
    }

    // Contact
    if (lowerInput.includes('contacto') || lowerInput.includes('telefono') || lowerInput.includes('llamar')) {
      return `📞 **¡Contactanos cuando quieras!**

📱 WhatsApp: ${business.phone || 'No configurado'}
📧 Email: ${business.email || 'No configurado'}
📍 ${business.address || 'Dirección no configurada'}

También podés seguir escribiendo acá que te contesto al toque. ¿En qué más te ayudo?`
    }

    // Goodbye
    if (lowerInput.includes('gracias') || lowerInput.includes('chau') || lowerInput.includes('adiós') || lowerInput.includes('hasta luego')) {
      return `¡Gracias a vos! 😊 

Nos vemos pronto en ${business.name}. ¡Que tengas un día bárbaro!

¡Chau! 👋`
    }

    // Default fallback - much more Argentine
    return `¡Ey! No entendí bien lo que me escribiste. 

Pero tranqui, te puedo ayudar con:
🍽️ Reservas para cenar o para el baile
📍 Info sobre horarios y ubicación  
🎁 Consultar tus puntos de fidelidad
💰 Precios y promociones

¿Con qué te ayudo?`
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

  private isReservationDetails(input: string): boolean {
    const lowerInput = input.toLowerCase()
    
    // Don't treat phone numbers as reservation details
    if (/^\d{7,15}$/.test(input.trim()) || /^[\+\-\s\d]{8,20}$/.test(input.trim())) {
      return false
    }
    
    const reservationKeywords = [
      'viernes', 'sábado', 'sabado', 'domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves',
      'mañana', 'manana', 'hoy', 'pasado mañana', 'fin de semana', 'que viene', 'próximo', 'proximo', 'este',
      'personas', 'gente', 'somos', 'vamos a ser', 'para',
      'cena', 'cenar', 'baile', 'bailar', 'fiesta',
      'para el', 'para la', 'el día', 'la noche', 'a las', ':00', 'hs'
    ]

    // Only check for small numbers (1-2 digits) in reservation context, not standalone long numbers
    const smallNumberPattern = /\b([1-9]|1[0-9]|2[0-3])\b(?=\s*(personas?|gente|hs|horas?))/i
    const timePatterns = /\d{1,2}:\d{2}|\d{1,2}\s*hs|\d{1,2}\s*horas?|a\s*las\s*\d{1,2}/i
    
    return reservationKeywords.some(keyword => lowerInput.includes(keyword)) || 
           smallNumberPattern.test(input) ||
           timePatterns.test(input)
  }

  private async processReservationDetails(input: string, business: BusinessInfo, customerNumber: string, customerName?: string, context?: ConversationContext): Promise<string> {
    // Use context information as base, then check current message for new info
    let day = context?.reservation_day || ''
    let time = context?.reservation_time || ''
    let people = context?.reservation_people?.toString() || ''
    let type = context?.reservation_type || ''
    let name = context?.customer_name || customerName || ''
    
    // If we have a valid customer name from WhatsApp profile and it's not a generic name, use it
    if (customerName && customerName !== 'Cliente' && customerName !== 'TestUser' && customerName.trim() !== '') {
      name = customerName
    }
    
    // DEBUG: Log name variables
    console.log(`🔍 NAME DEBUG:`)
    console.log(`   - context?.customer_name: "${context?.customer_name}"`)
    console.log(`   - customerName parameter: "${customerName}"`)
    console.log(`   - final name variable: "${name}"`)
    console.log(`   - name check result: ${!name || name === 'Cliente' || name === 'TestUser' || name.trim() === ''}`)
    
    // DEBUG: Log name resolution
    console.log(`🔍 NAME DEBUG:`)
    console.log(`   - context?.customer_name: "${context?.customer_name}"`)
    console.log(`   - customerName: "${customerName}"`)
    console.log(`   - final name: "${name}"`)
    console.log(`   - name validation: !name=${!name}, name === 'Cliente'=${name === 'Cliente'}, name === 'TestUser'=${name === 'TestUser'}, name.trim() === ''=${name.trim() === ''}`)
    

    const lowerInput = input.toLowerCase()
    
    
    // Extract day information from current message using enhanced date parsing
    const extractedDay = this.extractDateFromMessage(input)
    if (extractedDay) {
      day = extractedDay
    }

    // Extract time information from current message (overrides context)
    const timeMatch = input.match(/(\d{1,2}):(\d{2})|(\d{1,2})\s*hs|a\s*las\s*(\d{1,2})/i)
    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2]) {
        time = `${timeMatch[1]}:${timeMatch[2]}hs`
      } else if (timeMatch[3]) {
        time = `${timeMatch[3]}hs`
      } else if (timeMatch[4]) {
        time = `${timeMatch[4]}hs`
      }
    }

    // Extract number of people from current message (overrides context)
    const peopleMatch = input.match(/(\d+)\s*personas?|somos\s*(\d+)|para\s*(\d+)|(\d+)\s*gente/i)
    if (peopleMatch) {
      people = peopleMatch[1] || peopleMatch[2] || peopleMatch[3] || peopleMatch[4]
    }

    // Extract type from current message (overrides context)
    if (lowerInput.includes('cena') || lowerInput.includes('cenar')) {
      type = 'cena'
    } else if (lowerInput.includes('baile') || lowerInput.includes('bailar')) {
      type = 'baile'
    } else if (time && !type) {
      // Auto-detect based on time only if not explicitly mentioned
      const hour = parseInt(time.split(':')[0])
      if (hour >= 20 && hour <= 23) {
        type = 'cena'
      } else if (hour >= 23 || hour <= 4) {
        type = 'baile'
      }
    }

    // Generate intelligent response
    if (day && type) {
      // Has day and type, check if we need people count
      if (people) {
        // Check if we have a valid customer's name
        if (!name || name === 'Cliente' || name === 'TestUser' || name.trim() === '') {
          return `¡Perfecto! Tengo todos los datos de tu reserva:

📅 **${day.toUpperCase()}** ${time ? `a las ${time}` : ''}
👥 **${people} personas**  
🍽️ **Para ${type}**

Para confirmarla solo me falta tu nombre. ¿Cómo te llamás?`
        }
        
        // Complete reservation information - generate payment link
        const montoSeña = 1 * parseInt(people) // $1 peso por persona para pruebas
        
        try {
          const linkPago = await mercadoPagoService.crearLinkDePago(
            montoSeña,
            `Seña reserva - ${name} - ${day} ${time} - ${people} personas`,
            customerNumber
          )
          
          return `¡Bárbaro ${name}! Tengo todos los datos de tu reserva:

📅 **${day.toUpperCase()}** ${time ? `a las ${time}` : ''}
👥 **${people} personas**
🍽️ **Para ${type}**

⚠️ **IMPORTANTE - LEÉ ESTAS CONDICIONES:**

⚠️ Si queres asegurar tu lugar, será obligatorio abonar una seña.
⚠️ Tolerancia de reserva hasta las 22hs, luego, se pierde el lugar (SIN EXCEPCIÓN)
⚠️ Menores de 18 años pueden permanecer en el bar hasta 1am.

💰 **SEÑA REQUERIDA: $${montoSeña} pesos** ($1 por persona)

🔗 **PAGÁ TU SEÑA AQUÍ:**
${linkPago}

Una vez que completes el pago, se confirma tu reserva automáticamente! ✅`
        } catch (error) {
          console.error('Error generando link de pago:', error)
          return `¡Bárbaro ${name}! Tengo todos los datos de tu reserva:

📅 **${day.toUpperCase()}** ${time ? `a las ${time}` : ''}
👥 **${people} personas**
🍽️ **Para ${type}**

Hubo un problema generando el link de pago. Por favor, contacta al restaurant directamente.`
        }
      } else {
        // Missing people count
        return `¡Dale ${name ? name : ''}! Ya tengo que es para **${day}** ${time ? `a las ${time}` : ''} **para ${type}**.

Solo me falta saber: **¿Cuántas personas van a ser?**

Y te confirmo la reserva al toque.`
      }
    }
    else if (day || people || type || time) {
      // Partial information, ask for missing details
      let missing = []
      if (!day) missing.push('📅 ¿Para qué día?')
      if (!people) missing.push('👥 ¿Cuántas personas?')
      if (!type && !time) missing.push('🍽️ ¿Para cenar o para el baile?')

      let hasInfo = []
      if (day) hasInfo.push(`el día (${day})`)
      if (people) hasInfo.push(`la cantidad (${people} personas)`)
      if (type) hasInfo.push(`que es para ${type}`)
      if (time && !type) hasInfo.push(`el horario (${time})`)

      return `¡Dale ${name ? name : ''}! Ya tengo ${hasInfo.join(' y ')}.

Necesito que me confirmes:
${missing.join('\n')}

Así te confirmo la reserva al toque.`
    }
    else {
      // No clear reservation info found
      return `¡Dale ${name ? name : ''}! Te ayudo con la reserva. Para confirmarla necesito:

📅 ¿Para qué día la querés? (ej: "viernes", "mañana", "sábado")
👥 ¿Cuántas personas van a ser?
🍽️ ¿Es para cenar o para el baile?

Contame y te la confirmo enseguida.`
    }
  }

  private async saveCustomer(phoneNumber: string, name: string, businessId?: string): Promise<string | null> {
    try {
      // Try to save or update customer in database
      const customerData = {
        phone: phoneNumber,
        name: name,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase.from('customers').upsert(customerData, {
        onConflict: 'business_id,phone'
      }).select('id').single()

      if (error) {
        console.error('Error saving customer:', error)
        return null
      }
      return data?.id || null
    } catch (error: any) {
      console.error('Error saving customer:', error)
      return null
    }
  }

  private async saveReservation(businessId: string, customerPhone: string, customerName: string, day: string, time: string, type: string, people: string): Promise<boolean> {
    try {
      // First, ensure customer exists and get their ID
      const customerId = await this.saveCustomer(customerPhone, customerName, businessId)
      if (!customerId) {
        console.error('Could not create/find customer for reservation')
        return false
      }

      // Parse the reservation details
      const reservationDate = this.parseReservationDate(day, time)
      if (!reservationDate) {
        return false
      }

      // Save the reservation
      const reservationData = {
        business_id: businessId,
        customer_id: customerId,
        reservation_type: type,
        reservation_date: reservationDate.toISOString(),
        party_size: parseInt(people),
        status: 'confirmed',
        phone: customerPhone,
        customer_name: customerName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase.from('reservations').insert(reservationData).select('id').single()

      if (error) {
        console.error('Error saving reservation:', error)
        return false
      }
      return true
    } catch (error: any) {
      console.error('Error saving reservation:', error)
      return false
    }
  }

  private parseReservationDate(day: string, time: string): Date | null {
    try {
      const now = new Date()
      let targetDate = new Date()

      // Parse day
      switch (day.toLowerCase()) {
        case 'hoy':
          targetDate = new Date(now)
          break
        case 'mañana':
        case 'manana':
          targetDate = new Date(now)
          targetDate.setDate(now.getDate() + 1)
          break
        case 'lunes':
          targetDate = this.getNextWeekday(now, 1) // Monday = 1
          break
        case 'lunes que viene':
          targetDate = this.getNextWeekday(now, 1, true) // Next Monday
          break
        case 'martes':
          targetDate = this.getNextWeekday(now, 2) // Tuesday = 2
          break
        case 'martes que viene':
          targetDate = this.getNextWeekday(now, 2, true) // Next Tuesday
          break
        case 'miércoles':
        case 'miercoles':
          targetDate = this.getNextWeekday(now, 3) // Wednesday = 3
          break
        case 'miércoles que viene':
        case 'miercoles que viene':
          targetDate = this.getNextWeekday(now, 3, true) // Next Wednesday
          break
        case 'jueves':
          targetDate = this.getNextWeekday(now, 4) // Thursday = 4
          break
        case 'jueves que viene':
          targetDate = this.getNextWeekday(now, 4, true) // Next Thursday
          break
        case 'viernes':
          targetDate = this.getNextWeekday(now, 5) // Friday = 5
          break
        case 'viernes que viene':
          targetDate = this.getNextWeekday(now, 5, true) // Next Friday
          break
        case 'sábado':
        case 'sabado':
          targetDate = this.getNextWeekday(now, 6) // Saturday = 6
          break
        case 'sábado que viene':
        case 'sabado que viene':
          targetDate = this.getNextWeekday(now, 6, true) // Next Saturday
          break
        case 'domingo':
          targetDate = this.getNextWeekday(now, 0) // Sunday = 0
          break
        case 'domingo que viene':
          targetDate = this.getNextWeekday(now, 0, true) // Next Sunday
          break
        default:
          console.error('Unknown day format:', day)
          return null
      }

      // Parse time - handle formats like "20hs", "20:00hs", "8pm"
      if (time && time.trim() !== '') {
        const timeMatch = time.match(/(\d{1,2})(?::(\d{2}))?(?:hs|:00hs)?/)
        if (timeMatch) {
          const hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2] || '0')
          targetDate.setHours(hours, minutes, 0, 0)
        } else {
          console.error('Unknown time format:', time)
          return null
        }
      } else {
        // No time specified, use default time for dinner (20:00)
        targetDate.setHours(20, 0, 0, 0)
      }

      return targetDate
    } catch (error) {
      console.error('Error parsing reservation date:', error)
      return null
    }
  }

  private getNextWeekday(fromDate: Date, targetWeekday: number, forceNext: boolean = false): Date {
    const result = new Date(fromDate)
    const currentWeekday = fromDate.getDay()
    
    let daysToAdd = targetWeekday - currentWeekday
    
    if (daysToAdd <= 0 || forceNext) {
      daysToAdd += 7
    }
    
    result.setDate(fromDate.getDate() + daysToAdd)
    return result
  }

  private isNewConversation(messageText: string, existingContext: ConversationContext | null): boolean {
    if (!existingContext) {
      return false // No existing context, so not really "new"
    }

    const lowerMessage = messageText.toLowerCase()
    
    // Check if message contains greeting
    const hasGreeting = lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas tardes')
    
    // Check if message has complete reservation data (name + details) OR is just providing a name when context has reservation data
    const hasCompleteReservationData = (
      (lowerMessage.includes('nombre') || lowerMessage.includes('a nombre de') || lowerMessage.match(/^\w+\s+(?:somos|para)/)) &&
      (lowerMessage.includes('persona') || lowerMessage.includes('gente') || /\d+/.test(lowerMessage)) &&
      (lowerMessage.includes('lunes') || lowerMessage.includes('martes') || lowerMessage.includes('miércoles') || lowerMessage.includes('miercoles') || lowerMessage.includes('jueves') || lowerMessage.includes('viernes') || lowerMessage.includes('sábado') || lowerMessage.includes('sabado') || lowerMessage.includes('domingo') || lowerMessage.includes('hoy') || lowerMessage.includes('mañana') || lowerMessage.includes('manana'))
    )
    
    // Check if it's just providing a name for existing reservation context
    const isProvidingNameForReservation = (
      existingContext && 
      (existingContext.reservation_day || existingContext.reservation_people || existingContext.reservation_type) &&
      (lowerMessage.match(/^soy\s+\w+$/) || lowerMessage.match(/^me\s+llamo\s+\w+$/))
    )
    
    // Check if context has any reservation data
    const contextHasReservationData = existingContext.reservation_day || 
                                     existingContext.reservation_time || 
                                     existingContext.reservation_type || 
                                     existingContext.reservation_people

    // Check if enough time has passed (more than 15 minutes since last update)
    const lastUpdate = new Date(existingContext.updated_at || existingContext.created_at || '')
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const hasBeenLongTime = lastUpdate < fifteenMinutesAgo

    // It's a new conversation if:
    // 1. Has complete reservation data in a single message (new reservation)
    // 2. Has greeting AND complete reservation data AND existing context has reservation data
    // 3. Has been more than 15 minutes since last update AND has greeting AND no current reservation in progress
    // 4. NEVER reset if just providing name for existing reservation
    return (hasCompleteReservationData && !isProvidingNameForReservation) ||
           (hasGreeting && hasCompleteReservationData && contextHasReservationData && !isProvidingNameForReservation) ||
           (hasBeenLongTime && hasGreeting && !contextHasReservationData && !isProvidingNameForReservation)
  }

  private async clearConversationContext(customerPhone: string, businessId: string): Promise<void> {
    try {
      await supabase.from('conversation_context')
        .delete()
        .eq('customer_phone', customerPhone)
        .eq('business_id', businessId)
    } catch (error: any) {
      console.error('Error clearing conversation context:', error)
    }
  }

  private async generateAIResponse(input: string, personality: BotPersonality, business: BusinessInfo, customerName?: string, alreadyGreeted?: boolean, context?: ConversationContext): Promise<string | null> {
    try {
      // Don't use AI for reservation details - let specific logic handle it
      if (this.isReservationDetails(input.toLowerCase())) {
        return null
      }
      
      // Don't use AI for transfer receipts - let specific logic handle it
      if (this.isTransferReceipt(input, input.toLowerCase())) {
        console.log('🔍 AI detected transfer receipt, delegating to specific logic')
        return null
      }
      
      // Prepare business information for AI
      const businessInfo = this.formatBusinessInfoForAI(business)
      const conversationHistory = context?.context_data?.messages?.slice(-3) || [] // Last 3 messages for context
      
      const prompt = `Eres ${personality.bot_name}, ${personality.personality_description}

INFORMACIÓN DEL NEGOCIO:
${businessInfo}

PERSONALIDAD: ${personality.tone}
CLIENTE: ${customerName || 'Cliente'}
YA SE SALUDARON: ${alreadyGreeted ? 'Sí' : 'No'}

HISTORIAL RECIENTE:
${conversationHistory.map(m => `- ${m.message} (${m.intent})`).join('\n')}

INSTRUCCIONES:
- Responde de forma natural y argentina como ${personality.bot_name}
- Si preguntan por horarios, ubicación, contacto, precios o menú, usa la información del negocio
- Si es un saludo y ya se saludaron antes, sé breve
- Si mencionan reserva, mesa o quieren reservar, indica que necesitas: día, hora, cantidad de personas y tipo (cena/baile)
- Usa emojis apropiados
- Sé conversacional y amigable
- NO inventes información que no tienes

MENSAJE DEL CLIENTE: "${input}"

RESPUESTA (máximo 300 caracteres):`

      // Use a simple AI completion (you can use OpenAI API, Anthropic, or any AI service)
      // For now, I'll implement a fallback that returns null to use the rule-based system
      // But you can integrate with your preferred AI service here
      
      const aiResponse = await this.callAIService(prompt)
      return aiResponse
      
    } catch (error) {
      console.error('Error generating AI response:', error)
      return null // Fallback to rule-based system
    }
  }

  private async callAIService(prompt: string): Promise<string | null> {
    try {
      // Use a simple local AI logic for now (you can replace with external API later)
      // This is a lightweight implementation that mimics AI behavior
      return this.generateSmartResponse(prompt)
    } catch (error) {
      console.error('AI service error:', error)
      return null
    }
  }

  private generateSmartResponse(prompt: string): string | null {
    // Extract the customer message from the prompt
    const messageMatch = prompt.match(/MENSAJE DEL CLIENTE: "(.+)"/)
    if (!messageMatch) return null
    
    const message = messageMatch[1].toLowerCase()
    
    // Extract business info
    const businessName = prompt.match(/NOMBRE: (.+)/)?.[1] || 'el negocio'
    const botName = prompt.match(/Eres ([^,]+),/)?.[1] || 'el asistente'
    const alreadyGreeted = prompt.includes('YA SE SALUDARON: Sí')
    const customerName = prompt.match(/CLIENTE: (.+)/)?.[1]
    const isCustomerNamed = customerName && customerName !== 'Cliente'
    
    // Detect intent and generate natural response
    if (message.includes('horario') || message.includes('hora') || message.includes('abierto') || message.includes('cerrado')) {
      const hoursInfo = this.extractHoursFromPrompt(prompt)
      const greeting = message.includes('hola') && !alreadyGreeted ? 
        (isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! ') : ''
      return `${greeting}📅 Nuestros horarios son:\n${hoursInfo}\n¿Necesitás algo más?`
    }
    
    if (message.includes('ubicacion') || message.includes('direccion') || message.includes('donde')) {
      const address = prompt.match(/DIRECCIÓN: (.+)/)?.[1] || 'No tenemos dirección configurada'
      const greeting = message.includes('hola') && !alreadyGreeted ? 
        (isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! ') : ''
      return `${greeting}📍 Estamos en ${address}. ¡Te esperamos!`
    }
    
    if (message.includes('contacto') || message.includes('telefono') || message.includes('llamar')) {
      const phone = prompt.match(/TELÉFONO: (.+)/)?.[1] || 'No configurado'
      const email = prompt.match(/EMAIL: (.+)/)?.[1] || 'No configurado'
      const greeting = message.includes('hola') && !alreadyGreeted ? 
        (isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! ') : ''
      return `${greeting}📞 Podes contactarnos:\n📱 WhatsApp: ${phone}\n📧 Email: ${email}`
    }
    
    // Check for loyalty points BEFORE prices (priority!) - but let main logic handle detailed response
    if ((message.includes('puntos') || message.includes('fidelidad') || message.includes('loyalty')) && 
        !message.includes('precio') && !message.includes('costo') && !message.includes('cuanto sale') && !message.includes('cuanto cuesta')) {
      // Return null to let main logic handle loyalty points with actual data from database
      return null
    }
    
    if ((message.includes('precio') || message.includes('costo') || message.includes('cuanto')) && 
        !message.includes('puntos') && !message.includes('fidelidad')) {
      const greeting = message.includes('hola') && !alreadyGreeted ? 
        (isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! ') : ''
      return `${greeting}💰 Nuestros precios son súper accesibles:\n🍽️ Cenas: $15.000-$30.000\n🎉 Baile: $8.000\n🍸 Tragos: desde $4.000`
    }
    
    if (message.includes('menu') || message.includes('comida') || message.includes('carta')) {
      const greeting = message.includes('hola') && !alreadyGreeted ? 
        (isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! ') : ''
      return `${greeting}🍽️ Nuestra carta tiene:\n🥩 Asados y parrilla\n🍕 Pizzas artesanales\n🍸 Tragos de autor\n🧀 Picadas para compartir`
    }
    
    // Check if message combines greeting + reservation request with enhanced detection
    const hasGreeting = message.includes('hola') || message.includes('buenas') || 
                       message.includes('como estas') || message.includes('como andas') || 
                       message.includes('que tal') || message.includes('como va')
    const hasReservationKeywords = message.includes('reserva') || message.includes('mesa') || message.includes('booking')
    const hasReservationVerbs = message.includes('reservar') || message.includes('reservemos') || message.includes('reservo')
    const hasReservationIntent = (message.includes('quisiera') || message.includes('quiero') || message.includes('queremos') || message.includes('me gustaria')) && 
                               (hasReservationKeywords || hasReservationVerbs)
    const hasPositiveReservationResponse = (message.includes('dale') || message.includes('genial') || message.includes('perfecto') || message.includes('barbaro') || message.includes('bárbaro') || message.includes('si') || message.includes('sí')) &&
                                         (hasReservationKeywords || hasReservationVerbs || message.includes('reservemos') || message.includes('reserva'))
    const hasReservationRequest = hasReservationKeywords || hasReservationVerbs || hasReservationIntent || hasPositiveReservationResponse
    
    if (hasGreeting && hasReservationRequest) {
      // Greeting + reservation in same message - let structured flow handle but with greeting
      return null // Use structured reservation flow
    }
    
    if (hasGreeting && alreadyGreeted) {
      return `¡Hola de nuevo! ¿En qué más te puedo ayudar?`
    }
    
    if (hasGreeting && !alreadyGreeted) {
      const personalGreeting = isCustomerNamed ? `¡Hola ${customerName}! ` : '¡Hola! '
      return `${personalGreeting}Soy ${botName} de ${businessName}. ¿En qué te puedo ayudar hoy?`
    }
    
    // If it's about reservations only, return null to use the structured flow
    if (hasReservationRequest) {
      return null // Use structured reservation flow
    }
    
    // If it contains reservation details, return null to use structured flow
    if (this.isReservationDetails(message)) {
      return null // Use structured reservation flow
    }
    
    // Default friendly response
    return `¡Dale! Soy ${botName} de ${businessName}. Puedo ayudarte con horarios, ubicación, contacto, precios, menú o reservas. ¿Qué necesitás?`
  }

  private extractHoursFromPrompt(prompt: string): string {
    const hoursSection = prompt.match(/HORARIOS:\n([\s\S]*?)(?:\n[A-Z]+:|$)/)?.[1]
    if (!hoursSection) return 'No tenemos horarios configurados'
    
    // Only process lines that are actual schedule lines (start with "- ")
    const lines = hoursSection.split('\n')
      .filter(line => line.trim() && line.startsWith('- '))
      .map(line => line.replace('- ', ''))
    
    if (lines.length === 0) return 'No tenemos horarios configurados'
    
    const openDays = lines.filter(line => !line.includes('CERRADO'))
    const closedDays = lines.filter(line => line.includes('CERRADO')).map(line => line.split(':')[0])
    
    let result = ''
    if (openDays.length > 0) {
      result += '🟢 ABIERTO:\n' + openDays.map(day => `- ${day}`).join('\n') + '\n'
    }
    if (closedDays.length > 0) {
      result += '🔴 CERRADO: ' + closedDays.join(', ')
    }
    
    return result
  }

  private formatBusinessInfoForAI(business: BusinessInfo): string {
    let info = `NOMBRE: ${business.name}\n`
    
    if (business.address) {
      info += `DIRECCIÓN: ${business.address}\n`
    }
    
    if (business.phone) {
      info += `TELÉFONO: ${business.phone}\n`
    }
    
    if (business.email) {
      info += `EMAIL: ${business.email}\n`
    }
    
    if (business.working_hours) {
      info += `HORARIOS:\n`
      const hours = business.working_hours
      const dayNames = {
        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
      }
      
      Object.entries(hours).forEach(([day, schedule]: [string, any]) => {
        const dayName = dayNames[day as keyof typeof dayNames]
        if (schedule.closed) {
          info += `- ${dayName}: CERRADO\n`
        } else {
          info += `- ${dayName}: ${schedule.open} a ${schedule.close}\n`
        }
      })
    }
    
    if (business.description) {
      info += `DESCRIPCIÓN: ${business.description}\n`
    }
    
    return info
  }

  private detectIntent(lowerInput: string): string {
    if (lowerInput.includes('horario') || lowerInput.includes('hora') || lowerInput.includes('abierto') || lowerInput.includes('cerrado')) {
      return 'horarios'
    }
    if (lowerInput.includes('ubicacion') || lowerInput.includes('direccion') || lowerInput.includes('donde') || lowerInput.includes('como llegar')) {
      return 'ubicacion'
    }
    if (lowerInput.includes('contacto') || lowerInput.includes('telefono') || lowerInput.includes('llamar')) {
      return 'contacto'
    }
    if (lowerInput.includes('reserva') || lowerInput.includes('mesa') || lowerInput.includes('booking') || lowerInput.includes('quisiera') || lowerInput.includes('quiero')) {
      return 'reserva'
    }
    if (lowerInput.includes('hola') || lowerInput.includes('buenas') || lowerInput.includes('buenos días') || lowerInput.includes('buenas tardes')) {
      return 'saludo'
    }
    if (lowerInput.includes('gracias') || lowerInput.includes('chau') || lowerInput.includes('adiós')) {
      return 'despedida'
    }
    return 'general'
  }

  private generateBusinessHoursResponse(business: BusinessInfo): string {
    if (!business.working_hours) {
      return `📅 **Horarios de ${business.name}:**

No tenemos horarios configurados en el sistema. 
Por favor contactanos para más información.`
    }

    const hours = business.working_hours
    const dayNames = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    }

    let openDays = []
    let closedDays = []

    Object.entries(hours).forEach(([day, schedule]: [string, any]) => {
      const dayName = dayNames[day as keyof typeof dayNames]
      if (schedule.closed) {
        closedDays.push(dayName)
      } else {
        openDays.push(`• **${dayName}**: ${schedule.open} a ${schedule.close}hs`)
      }
    })

    let response = `📅 **Horarios de ${business.name}:**\n\n`
    
    if (openDays.length > 0) {
      response += `🟢 **ABIERTO:**\n${openDays.join('\n')}\n\n`
    }
    
    if (closedDays.length > 0) {
      response += `🔴 **CERRADO:** ${closedDays.join(', ')}\n\n`
    }

    response += `¿Necesitás algo más?`
    
    return response
  }

  private async getConversationContext(customerPhone: string, businessId: string): Promise<ConversationContext | null> {
    try {
      // Clean up expired contexts first
      await supabase.from('conversation_context')
        .delete()
        .lt('expires_at', new Date().toISOString())

      // Get current conversation context
      const { data, error } = await supabase
        .from('conversation_context')
        .select('*')
        .eq('customer_phone', customerPhone)
        .eq('business_id', businessId)
        .single()

      if (error) {
        // No context exists yet
        return null
      }

      return data
    } catch (error: any) {
      console.error('Error getting conversation context:', error)
      return null
    }
  }

  private isNameRegistrationMessage(messageText: string, currentCustomerName?: string): boolean {
    // Only consider it name registration if we don't have a customer name yet
    if (currentCustomerName && currentCustomerName !== 'Cliente') {
      return false
    }

    const lowerMessage = messageText.toLowerCase().trim()
    
    // Exclude common greetings and other words that aren't names
    const excludedWords = ['hola', 'buenas', 'buenos', 'tardes', 'dias', 'noches', 'que', 'tal', 'como', 'estas', 'gracias', 'si', 'no', 'ok', 'bien', 'mal']
    if (excludedWords.includes(lowerMessage)) {
      return false
    }
    
    // Common patterns for name registration
    const namePatterns = [
      /^soy\s+([a-záéíóúñ]+)$/i,
      /^me\s+llamo\s+([a-záéíóúñ]+)$/i,
      /^mi\s+nombre\s+es\s+([a-záéíóúñ]+)$/i,
      /^([a-záéíóúñ]+)$/i // Just a single name
    ]

    return namePatterns.some(pattern => pattern.test(messageText)) && 
           messageText.trim().split(' ').length <= 2 && // Max 2 words for name
           !excludedWords.includes(lowerMessage.split(' ')[0]) // First word isn't a common word
  }

  private extractNameFromMessage(messageText: string): string | null {
    const excludedWords = ['hola', 'buenas', 'buenos', 'tardes', 'dias', 'noches', 'que', 'tal', 'como', 'estas', 'gracias', 'si', 'no', 'ok', 'bien', 'mal']
    
    const patterns = [
      /soy\s+([a-záéíóúñ]+)/i,
      /me\s+llamo\s+([a-záéíóúñ]+)/i,
      /mi\s+nombre\s+es\s+([a-záéíóúñ]+)/i,
      /^([a-záéíóúñ]+)$/i // Just a single name
    ]

    for (const pattern of patterns) {
      const match = messageText.match(pattern)
      if (match && match[1]) {
        const name = match[1].toLowerCase()
        // Don't extract if it's a common word/greeting
        if (excludedWords.includes(name)) {
          return null
        }
        // Capitalize first letter
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()
      }
    }

    return null
  }

  private async getLoyaltyPointsResponse(customerPhone: string, businessId: string): Promise<string | null> {
    try {
      console.log(`Getting loyalty points for phone: ${customerPhone}, business: ${businessId}`)
      
      // Get customer points directly from database with timeout
      const customerQuery = supabase
        .from('customers')
        .select('id, name, points')
        .eq('phone', customerPhone)
        .eq('business_id', businessId)
        .single()

      // Add timeout to prevent hanging
      const customerResult = await Promise.race([
        customerQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 3000))
      ]) as any

      if (customerResult.error) {
        console.error('Error fetching customer for loyalty:', customerResult.error)
        return null
      }

      const customer = customerResult.data
      console.log('Customer found for loyalty:', customer)

      if (!customer) {
        return null
      }

      const customerPoints = customer.points || 0
      
      // Get redeemable items from database
      const redeemableItemsQuery = supabase
        .from('redeemable_items')
        .select('name, points_required, description')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('points_required', { ascending: true })
        .limit(10)

      const redeemableItemsResult = await Promise.race([
        redeemableItemsQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 3000))
      ]) as any

      let redeemableItemsText = '• Descuentos en tu próxima visita\n• Tragos gratis\n• Entradas sin cargo para el baile'
      
      if (!redeemableItemsResult.error && redeemableItemsResult.data && redeemableItemsResult.data.length > 0) {
        const items = redeemableItemsResult.data
        redeemableItemsText = items.map((item: any) => `• ${item.name} (${item.points_required} puntos)`).join('\n')
      }
      
      let loyaltyMessage = `💎 **Tenés ${customerPoints} puntos acumulados**

🎁 **Con tus puntos podés canjear:**
${redeemableItemsText}

¡Hacé tu reserva para venir al local y canjear tus puntos!`

      return loyaltyMessage

    } catch (error) {
      console.error('Error fetching loyalty points:', error)
      return null
    }
  }

  private async updateConversationContext(customerPhone: string, businessId: string, messageText: string, customerName?: string, existingContext?: ConversationContext | null): Promise<void> {
    try {
      const lowerInput = messageText.toLowerCase()
      
      // Extract reservation details from message
      const extractedData: Partial<ConversationContext> = {}

      // Extract name if mentioned
      const nameMatch = messageText.match(/soy\s+(\w+)|me\s+llamo\s+(\w+)|mi\s+nombre\s+es\s+(\w+)/i)
      if (nameMatch) {
        extractedData.customer_name = nameMatch[1] || nameMatch[2] || nameMatch[3]
      } else if (customerName) {
        extractedData.customer_name = customerName
      }

      // Update conversation memory in context_data
      const currentContextData = existingContext?.context_data || {}
      const messageHistory = currentContextData.messages || []
      
      // Add current message to history (keep last 10 messages)
      messageHistory.push({
        message: messageText,
        timestamp: new Date().toISOString(),
        intent: this.detectIntent(lowerInput)
      })
      if (messageHistory.length > 10) {
        messageHistory.shift() // Remove oldest message
      }

      // Mark as greeted if this message contains greeting
      const hasGreeting = lowerInput.includes('hola') || lowerInput.includes('buenas') || lowerInput.includes('buenos días') || lowerInput.includes('buenas tardes')
      
      extractedData.context_data = {
        ...currentContextData,
        messages: messageHistory,
        greeted: currentContextData.greeted || hasGreeting,
        lastMessageTime: new Date().toISOString()
      }

      // Extract day information - Enhanced date parsing
      const extractedDay = this.extractDateFromMessage(messageText)
      if (extractedDay) {
        extractedData.reservation_day = extractedDay
      }

      // Extract time information
      const timeMatch = messageText.match(/(\d{1,2}):(\d{2})|(\d{1,2})\s*hs|a\s*las\s*(\d{1,2})/i)
      if (timeMatch) {
        if (timeMatch[1] && timeMatch[2]) {
          extractedData.reservation_time = `${timeMatch[1]}:${timeMatch[2]}hs`
        } else if (timeMatch[3]) {
          extractedData.reservation_time = `${timeMatch[3]}:00hs`
        } else if (timeMatch[4]) {
          extractedData.reservation_time = `${timeMatch[4]}:00hs`
        }
      }

      // Extract number of people (but avoid phone numbers)
      const peopleMatch = messageText.match(/(\d+)\s*personas?|somos\s*(\d+)|para\s*(\d+)|(\d+)\s*gente/i)
      if (peopleMatch) {
        const people = parseInt(peopleMatch[1] || peopleMatch[2] || peopleMatch[3] || peopleMatch[4])
        // Only consider it people count if it's reasonable and not a phone number
        if (people && people > 0 && people <= 50 && people.toString().length <= 2) {
          extractedData.reservation_people = people
        }
      }

      // Extract type (cena or baile)
      if (lowerInput.includes('cena') || lowerInput.includes('cenar')) {
        extractedData.reservation_type = 'cena'
      } else if (lowerInput.includes('baile') || lowerInput.includes('bailar')) {
        extractedData.reservation_type = 'baile'
      } else if (extractedData.reservation_time) {
        // Auto-detect based on time
        const hour = parseInt(extractedData.reservation_time.split(':')[0])
        if (hour >= 20 && hour <= 23) {
          extractedData.reservation_type = 'cena'
        } else if (hour >= 23 || hour <= 4) {
          extractedData.reservation_type = 'baile'
        }
      }

      // Only update context if we have new information
      if (Object.keys(extractedData).length === 0 && !existingContext) {
        return
      }

      // Merge with existing context
      const contextData = {
        customer_phone: customerPhone,
        business_id: businessId,
        ...existingContext,
        ...extractedData,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
      }

      // Upsert conversation context
      await supabase.from('conversation_context').upsert(contextData, {
        onConflict: 'customer_phone,business_id'
      })

    } catch (error: any) {
      console.error('Error updating conversation context:', error)
      // Don't throw error, just log it
    }
  }

  // Function to detect transfer receipts
  private isTransferReceipt(input: string, lowerInput: string): boolean {
    // Keywords that indicate a transfer receipt
    const receiptKeywords = [
      'comprobante', 'transferencia', 'tranferí', 'transferi', 'envié', 'envie', 
      'pagué', 'pague', 'mandé', 'mande', 'listo', 'hecho', 'transferido',
      'enviado', 'pagado', 'seña', 'señé', 'sene'
    ]
    
    // Transfer-related patterns
    const transferPatterns = [
      /transferí/i, /transferi/i, /transfirí/i, /transfiri/i,
      /envié/i, /envie/i, /mandé/i, /mande/i,
      /pagué/i, /pague/i, /señé/i, /sene/i,
      /ya está/i, /ya esta/i, /listo/i, /hecho/i
    ]
    
    // Check for keywords
    const hasReceiptKeyword = receiptKeywords.some(keyword => lowerInput.includes(keyword))
    
    // Check for patterns
    const hasTransferPattern = transferPatterns.some(pattern => pattern.test(input))
    
    // Check for monetary amounts (indicates payment)
    const hasAmount = /\$\d+|(\d+)\s*(pesos?|usd|dolares?)/i.test(input)
    
    return hasReceiptKeyword || hasTransferPattern || (hasAmount && lowerInput.includes('transfer'))
  }

  // Function to process transfer receipts
  private async processTransferReceipt(input: string, business: BusinessInfo, customerNumber: string, customerName?: string, context?: ConversationContext, transferNumber?: string | null): Promise<string> {
    // Si no hay contexto de reserva pendiente, pedir los datos primero
    if (!context?.reservation_day || !context?.reservation_people || !context?.customer_name) {
      // Si hay un número de transferencia pero no hay reserva pendiente
      if (transferNumber) {
        return `¡Hola! Recibí tu número de transferencia: **${transferNumber}**

Pero no tengo una reserva pendiente asociada a tu número. 

Para confirmar tu reserva necesito que me digas:
📅 **¿Para qué día?** (ej: sábado, lunes, 15/09)
👥 **¿Para cuántas personas?**
🍽️ **¿Para cena o baile?**

Una vez que tengas tu reserva pendiente, podré verificar tu transferencia con MercadoPago.`
      }
      
      // Preguntar por los datos de reserva primero
      return this.generateReservationRequest(business, customerName)
    }

    // Si no hay número de transferencia, pedirlo
    if (!transferNumber) {
      const expectedAmount = 1000 * parseInt(context.reservation_people.toString())
      
      return `¡Perfecto ${context.customer_name}! Para confirmar tu reserva:

📅 **${context.reservation_day.toUpperCase()}** ${context.reservation_time ? `a las ${context.reservation_time}` : ''}
👥 **${context.reservation_people} personas**
💰 **Seña requerida:** $${expectedAmount} (${context.reservation_people} x $1000)

🏦 **Transferí a:** ${business.transfer_alias || 'alias.no.configurado'}

Una vez que hagas la transferencia, **enviame el número de referencia o ID de la transferencia** para verificarla con MercadoPago.

Ejemplo: "12345678901" o "MP-ABC123XYZ"`
    }

    // *** VERIFICAR TRANSFERENCIA CON MERCADOPAGO ***
    console.log(`🔍 Verificando transferencia ${transferNumber} con MercadoPago...`)
    
    const expectedAmount = 1000 * parseInt(context.reservation_people.toString())
    
    try {
      // Importar MercadoPagoService aquí para evitar dependencias circulares
      const { default: MercadoPagoService } = await import('../services/mercadoPagoService')
      const mercadoPagoService = new MercadoPagoService()
      
      // Verificar la transferencia
      const verificationResult = await mercadoPagoService.buscarPagoPorId(transferNumber)
      
      if (!verificationResult) {
        return `❌ **TRANSFERENCIA NO ENCONTRADA** ❌

🔍 No encontré ningún pago con el ID: **${transferNumber}**

Verificá que hayas copiado correctamente el número de referencia de tu transferencia.

Si el problema persiste:
• Revisá el comprobante y enviame el ID correcto
• Asegurate de haber transferido a: **${business.transfer_alias || 'alias.no.configurado'}**
• Contactanos directamente: ${business.phone || business.email || 'contacto no disponible'}`
      }

      // Verificar el estado y monto
      const tolerance = process.env.NODE_ENV === 'development' ? 150000 : 100
      const isValid = mercadoPagoService.verificarPago(verificationResult, expectedAmount, tolerance)
      
      console.log(`💰 Verificación MercadoPago:`)
      console.log(`   - ID: ${verificationResult.id}`)
      console.log(`   - Estado: ${verificationResult.status}`)
      console.log(`   - Monto: $${verificationResult.amount}`)
      console.log(`   - Esperado: $${expectedAmount}`)
      console.log(`   - Válido: ${isValid}`)
      
      if (!isValid) {
        const paymentInfo = mercadoPagoService.formatearInfoPago(verificationResult)
        
        return `❌ **PROBLEMA CON LA TRANSFERENCIA** ❌

${paymentInfo}

🔍 **Monto requerido:** $${expectedAmount} (${context.reservation_people} personas x $1000)

⚠️ **Problemas detectados:**
${verificationResult.status !== 'approved' ? `• Estado: ${verificationResult.status} (debe estar aprobado)` : ''}
${Math.abs(verificationResult.amount - expectedAmount) > tolerance ? `• Monto incorrecto: $${verificationResult.amount} (esperado: $${expectedAmount})` : ''}

Para confirmar tu reserva:
🏦 Transferí exactamente **$${expectedAmount}** a: **${business.transfer_alias || 'alias.no.configurado'}**
📱 Y enviame el nuevo número de referencia`
      }

      // *** TRANSFERENCIA VERIFICADA EXITOSAMENTE ***
      console.log(`✅ Transferencia verificada exitosamente: ${transferNumber}`)
      
      // Guardar la reserva
      const reservationSaved = await this.saveReservation(
        business.id, 
        customerNumber, 
        context.customer_name, 
        context.reservation_day, 
        context.reservation_time || '', 
        context.reservation_type || 'cena', 
        context.reservation_people.toString()
      )

      if (reservationSaved) {
        // Limpiar el contexto - reserva confirmada
        await this.clearConversationContext(customerNumber, business.id)
        
        const paymentInfo = mercadoPagoService.formatearInfoPago(verificationResult)
        
        return `¡EXCELENTE ${context.customer_name}! 🎉

✅ **RESERVA CONFIRMADA** ✅

📅 **${context.reservation_day.toUpperCase()}** ${context.reservation_time ? `a las ${context.reservation_time}` : ''}
👥 **${context.reservation_people} personas**
🍽️ **Para ${context.reservation_type || 'cena'}**

${paymentInfo}
📱 A nombre de: ${context.customer_name}
📞 Teléfono: ${customerNumber}

Te vamos a estar esperando en ${business.name}. 
¡Nos vemos el ${context.reservation_day}! 🍻

¡Gracias por elegirnos! 🙌`
      } else {
        const paymentInfo = mercadoPagoService.formatearInfoPago(verificationResult)
        
        return `✅ **TRANSFERENCIA VERIFICADA** ✅

${paymentInfo}

❗ Pero hubo un problema técnico al confirmar la reserva en el sistema.

Por favor contactanos directamente:
📞 ${business.phone || 'Teléfono no disponible'}
📧 ${business.email || 'Email no disponible'}

Tu transferencia está confirmada, solo necesitamos registrar la reserva manualmente.`
      }
      
    } catch (error: any) {
      console.error('Error verificando transferencia con MercadoPago:', error)
      
      return `⚠️ **ERROR VERIFICANDO TRANSFERENCIA** ⚠️

Hubo un problema técnico al verificar tu transferencia con MercadoPago.

🔍 **ID enviado:** ${transferNumber}

Intentá nuevamente en unos minutos o contactanos directamente:
📞 ${business.phone || 'Teléfono no disponible'}
📧 ${business.email || 'Email no disponible'}

**Error técnico:** ${error?.message || 'Error desconocido'}`
    }
  }

  /**
   * Extract date from message with enhanced parsing - supports both exact dates and relative days
   */
  private extractDateFromMessage(messageText: string): string | null {
    const lowerInput = messageText.toLowerCase()
    
    // ========== 1. EXACT DATES (highest priority) ==========
    
    // Check for specific date patterns: "DD de MONTH"
    const dateWithMonthMatch = messageText.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i)
    if (dateWithMonthMatch) {
      const day = dateWithMonthMatch[1]
      const month = dateWithMonthMatch[2].toLowerCase()
      return `${day} de ${month}`
    }
    
    // Check for "para el XX de MONTH"
    const paraElMatch = messageText.match(/para\s+el\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i)
    if (paraElMatch) {
      const day = paraElMatch[1]
      const month = paraElMatch[2].toLowerCase()
      return `${day} de ${month}`
    }
    
    // ========== 2. RELATIVE DAYS WITH CONTEXT ==========
    
    // LUNES variants
    if (lowerInput.includes('lunes que viene') || lowerInput.includes('próximo lunes') || lowerInput.includes('proximo lunes')) {
      return 'lunes que viene'
    } else if (lowerInput.includes('este lunes')) {
      return 'lunes'
    }
    
    // MARTES variants  
    if (lowerInput.includes('martes que viene') || lowerInput.includes('próximo martes') || lowerInput.includes('proximo martes')) {
      return 'martes que viene'
    } else if (lowerInput.includes('este martes')) {
      return 'martes'
    }
    
    // MIÉRCOLES variants
    if (lowerInput.includes('miércoles que viene') || lowerInput.includes('miercoles que viene') || 
        lowerInput.includes('próximo miércoles') || lowerInput.includes('proximo miercoles')) {
      return 'miércoles que viene'
    } else if (lowerInput.includes('este miércoles') || lowerInput.includes('este miercoles')) {
      return 'miércoles'
    }
    
    // JUEVES variants
    if (lowerInput.includes('jueves que viene') || lowerInput.includes('próximo jueves') || lowerInput.includes('proximo jueves')) {
      return 'jueves que viene'
    } else if (lowerInput.includes('este jueves')) {
      return 'jueves'
    }
    
    // VIERNES variants
    if (lowerInput.includes('viernes que viene') || lowerInput.includes('próximo viernes') || lowerInput.includes('proximo viernes')) {
      return 'viernes que viene'
    } else if (lowerInput.includes('este viernes')) {
      return 'viernes'
    }
    
    // SÁBADO variants
    if (lowerInput.includes('sábado que viene') || lowerInput.includes('sabado que viene') || 
        lowerInput.includes('próximo sábado') || lowerInput.includes('proximo sabado')) {
      return 'sábado que viene'
    } else if (lowerInput.includes('este sábado') || lowerInput.includes('este sabado')) {
      return 'sábado'
    }
    
    // DOMINGO variants
    if (lowerInput.includes('domingo que viene') || lowerInput.includes('próximo domingo') || lowerInput.includes('proximo domingo')) {
      return 'domingo que viene'
    } else if (lowerInput.includes('este domingo')) {
      return 'domingo'
    }
    
    // ========== 3. SIMPLE DAY NAMES (with word boundaries) ==========
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado']
    
    for (const day of daysOfWeek) {
      // Use word boundaries to avoid false positives (like "viernes" in "septiembre")
      const dayRegex = new RegExp(`\\b${day}\\b`, 'i')
      if (dayRegex.test(messageText)) {
        // Normalize miercoles -> miércoles, sabado -> sábado
        if (day === 'miercoles') return 'miércoles'
        if (day === 'sabado') return 'sábado'
        return day
      }
    }
    
    // ========== 4. RELATIVE DATES ==========
    if (lowerInput.includes('mañana') || lowerInput.includes('manana')) {
      return 'mañana'
    } else if (lowerInput.includes('hoy')) {
      return 'hoy'
    }
    
    return null
  }

  /**
   * Generar solicitud de datos de reserva
   */
  private generateReservationRequest(business: BusinessInfo, customerName?: string): string {
    const greeting = customerName ? `¡Hola ${customerName}! ` : '¡Hola! '
    
    return `${greeting}¡Perfecto para hacer tu reserva! 🍽️

Para confirmar necesito que me digas:

📅 **¿Para qué día?** 
   Ejemplo: "sábado", "15 de septiembre", "mañana"

� **¿Para cuántas personas?**
   Ejemplo: "4 personas", "somos 6"

🍽️ **¿Para cena o baile?**
   • Cena: hasta las 23:00hs
   • Baile: después de las 23:00hs

💰 **Seña:** $1 por persona
🏦 **CBU/Alias:** ${business.transfer_alias || 'alias.no.configurado'}

¡Enviame esos datos y te confirmo la reserva al toque! 🎉`
  }

}