import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import moment from 'moment-timezone'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface CustomerData {
  id?: string
  phone_number?: string
  phone?: string
  name?: string
  birthday?: string
  status?: string
  created_at?: string
}

export interface BusinessConfig {
  id: string
  name: string
  description?: string
  working_hours?: any
  services?: string[]
  bot_personality?: {
    tone: string
    personality_description: string
    welcome_message: string
    capabilities: string[]
  }
}

export class AIService {
  private conversations: Map<string, ConversationMessage[]> = new Map()
  private messageTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly RESPONSE_DELAY = 3000 // 3 seconds wait time

  constructor() {
    // Initialize conversation cleanup every hour
    setInterval(() => this.cleanupOldConversations(), 60 * 60 * 1000)
  }

  async processMessage(
    phoneNumber: string, 
    message: string, 
    businessId: string
  ): Promise<{ response?: string; needsTemplate?: boolean }> {
    
    // Clear any existing timer for this number
    const existingTimer = this.messageTimers.get(phoneNumber)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Add user message to conversation
    this.addToConversation(phoneNumber, { role: 'user', content: message })

    // Set timer to process the message after delay
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        try {
          const response = await this.generateResponse(phoneNumber, businessId)
          this.messageTimers.delete(phoneNumber)
          resolve({ response })
        } catch (error) {
          console.error('Error generating AI response:', error)
          resolve({ response: 'Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?' })
        }
      }, this.RESPONSE_DELAY)

      this.messageTimers.set(phoneNumber, timer)
    })
  }

  private async generateResponse(phoneNumber: string, businessId: string): Promise<string> {
    // Get conversation history
    const conversation = this.getConversation(phoneNumber)
    const lastMessage = conversation[conversation.length - 1]?.content || ''
    
    // Check for points query first (fast response)
    if (/puntos|fidelidad|loyalty|canjear|canjes|nivel|vip/i.test(lastMessage)) {
      const pointsResponse = await this.processPointsQuery(phoneNumber, businessId)
      if (pointsResponse) {
        this.addToConversation(phoneNumber, { role: 'assistant', content: pointsResponse })
        return pointsResponse
      }
    }

    // Get business configuration
    const businessConfig = await this.getBusinessConfig(businessId)
    if (!businessConfig) {
      return 'Lo siento, hay un problema con la configuración. Por favor contacta al establecimiento.'
    }

    // Get or create customer
    const customer = await this.getOrCreateCustomer(phoneNumber, businessId)
    
    // Build context for AI
    const systemPrompt = this.buildSystemPrompt(businessConfig, customer)
    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.slice(-10) // Last 10 messages for context
    ]

    // Generate response using OpenAI
    if (!openai) {
      throw new Error('OpenAI API key not configured')
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    })

    const aiResponse = completion.choices[0]?.message?.content || 
      'Lo siento, no pude generar una respuesta. ¿Podrías repetir tu consulta?'

    // Add AI response to conversation
    this.addToConversation(phoneNumber, { role: 'assistant', content: aiResponse })

    // Process any data extraction (name, birthday, reservations)
    await this.processDataExtraction(phoneNumber, conversation, customer, businessId)

    return aiResponse
  }

  private buildSystemPrompt(business: BusinessConfig, customer: CustomerData): string {
    const personality = business.bot_personality || {
      tone: 'amigable',
      personality_description: 'Asistente útil',
      capabilities: []
    }
    
    const customerPoints = customer.points || 0
    const customerVisits = customer.visit_count || 0
    const customerLevel = this.getCustomerLevel(customerPoints)
    
    return `Eres un asistente virtual inteligente para ${business.name}. 

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${business.name}
- Descripción: ${business.description || 'Establecimiento gastronómico'}
- Servicios: ${business.services?.join(', ') || 'Comida, bebidas'}

PERSONALIDAD:
- Tono: ${personality?.tone || 'Amigable y profesional'}
- Descripción: ${personality?.personality_description || 'Soy un asistente útil y amigable'}
- Capacidades: ${personality?.capabilities?.join(', ') || 'reservas, consultas'}

INFORMACIÓN DEL CLIENTE:
- Teléfono: ${customer.phone_number || customer.phone}
- Nombre: ${customer.name || 'No registrado aún'}
- Cumpleaños: ${customer.birthday || 'No registrado aún'}
- Puntos de fidelidad: ${customerPoints} puntos
- Visitas realizadas: ${customerVisits}
- Nivel VIP: ${customerLevel}
- Total gastado: $${customer.total_spent || 0}

INSTRUCCIONES IMPORTANTES:
1. CLIENTE NUEVO: Si el cliente no tiene nombre registrado, pregunta: "¡Hola! Para poder ayudarte mejor, ¿cómo te llamo?"
2. CLIENTE CONOCIDO: Si ya conoces al cliente, salúdalo por su nombre: "¡Hola [nombre]! ¿En qué puedo ayudarte hoy?"
3. CUMPLEAÑOS: Pide la fecha de cumpleaños solo después de tener su nombre: "Para nuestros registros y sorpresas especiales, ¿me podrías decir tu fecha de cumpleaños?"
4. RESERVAS - Flujo paso a paso:
   - Primero: "¿Para qué fecha te gustaría reservar?"
   - Segundo: "¿A qué hora prefieres?"  
   - Tercero: "¿Para cuántas personas?"
   - Cuarto: Confirma todos los datos antes de finalizar
5. PUNTOS DE FIDELIDAD: 
   - Si preguntan por puntos, responde con los datos actuales: "¡Tienes ${customerPoints} puntos acumulados!"
   - Si es nivel VIP, menciona sus beneficios: "Como cliente ${customerLevel}, tienes beneficios especiales"
   - Si no tienen puntos aún, explica cómo ganarlos
6. HORARIOS DE SERVICIOS IMPORTANTES:
   - CENA: Disponible desde las 20:30hs hasta las 23:59hs
   - BAILE: Disponible desde las 00:00hs (medianoche) hasta las 06:00hs
   - Si alguien solicita "baile" en horario de cena (20:00hs-23:59hs), corrígelo amablemente: "A esa hora sería para cena. El baile empieza a partir de medianoche. ¿Te parece bien reservar para cena a las [hora] o prefieres baile más tarde?"
7. CONFIRMACIÓN: Solo cuando tengas TODOS los datos (nombre, fecha, hora, personas), di: "¡Perfecto! Tu reserva está confirmada para [nombre] el [fecha] a las [hora] para [personas] personas"
8. TONO: Mantén siempre el tono ${personality?.tone || 'amigable'} y profesional
9. EMOJIS: Usa emojis moderadamente para ser cercano pero no exageres
10. NO ASUMAS: Nunca asumas información que el cliente no haya dado explícitamente

HORARIOS DE ATENCIÓN:
${this.formatWorkingHours(business.working_hours)}

Responde de manera natural, útil y según tu personalidad configurada.`
  }

  private formatWorkingHours(hours: any): string {
    if (!hours) return 'Consultar horarios al establecimiento'
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    
    let schedule = ''
    days.forEach((day, index) => {
      const dayHours = hours[day]
      if (dayHours?.closed) {
        schedule += `${dayNames[index]}: Cerrado\n`
      } else if (dayHours?.open && dayHours?.close) {
        schedule += `${dayNames[index]}: ${dayHours.open} - ${dayHours.close}\n`
      }
    })
    
    return schedule || 'Horarios disponibles consultando al establecimiento'
  }

  private async getBusinessConfig(businessId: string): Promise<BusinessConfig | null> {
    try {
      // Get business data
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, description, working_hours')
        .eq('id', businessId)
        .single()

      if (businessError || !business) {
        console.error('Error getting business:', businessError)
        return null
      }

      // Get bot personality separately
      const { data: personality, error: personalityError } = await supabase
        .from('bot_personalities')
        .select('tone, personality_description, welcome_message, capabilities, bot_name')
        .eq('business_id', businessId)
        .single()

      if (personalityError) {
        console.error('Error getting personality:', personalityError)
        // Return business with default personality
        return {
          ...business,
          bot_personality: {
            tone: 'amigable',
            personality_description: 'Asistente útil',
            welcome_message: 'Hola, ¿en qué puedo ayudarte?',
            capabilities: []
          }
        }
      }

      return {
        ...business,
        bot_personality: personality
      }
    } catch (error) {
      console.error('Error getting business config:', error)
      return null
    }
  }

  private async getOrCreateCustomer(phoneNumber: string, businessId: string): Promise<CustomerData> {
    try {
      // Try to find existing customer by phone
      let { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phoneNumber)
        .single()

      if (!error && customer) {
        console.log('Found existing customer:', customer)
        return customer
      }

      // If not found, try alternative phone field name
      ({ data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single())

      if (!error && customer) {
        console.log('Found existing customer (alternative field):', customer)
        return customer
      }

      // Create new customer placeholder (will be updated when we get name)
      console.log('Creating new customer placeholder for phone:', phoneNumber, 'business:', businessId)
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{ 
          phone: phoneNumber,
          business_id: businessId,
          status: 'pending_verification', // Mark as pending until we get name
          name: null // Explicitly null until verified
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating customer:', createError)
        // Try alternative field name
        const { data: newCustomer2, error: createError2 } = await supabase
          .from('customers')
          .insert([{ 
            phone_number: phoneNumber,
            business_id: businessId,
            status: 'pending_verification',
            name: null
          }])
          .select()
          .single()

        if (createError2) throw createError2
        return newCustomer2
      }

      return newCustomer
    } catch (error) {
      console.error('Error managing customer:', error)
      return { phone_number: phoneNumber, phone: phoneNumber, status: 'pending_verification' }
    }
  }

  private async processDataExtraction(
    _phoneNumber: string, 
    conversation: ConversationMessage[], 
    customer: CustomerData,
    businessId: string
  ): Promise<void> {
    try {
      const lastUserMessage = conversation
        .filter(msg => msg.role === 'user')
        .slice(-1)[0]?.content || ''

      // Note: Phone number comes automatically from WhatsApp webhook, no need to extract

      // Only extract name if we don't have it and the message seems to contain a name
      if (!customer.name && this.messageContainsName(lastUserMessage)) {
        const nameMatch = this.extractName(lastUserMessage)
        if (nameMatch && nameMatch !== 'Hola' && nameMatch !== 'Hi') {
          await this.updateCustomer(customer.id!, { 
            name: nameMatch,
            status: 'active' // Activate customer once we have name
          })
          console.log('Extracted name:', nameMatch)
        }
      }

      // Only extract birthday if we don't have it and message contains date-like patterns
      if (!customer.birthday && this.messageContainsBirthday(lastUserMessage)) {
        const birthdayMatch = this.extractBirthday(lastUserMessage)
        if (birthdayMatch) {
          await this.updateCustomer(customer.id!, { birthday: birthdayMatch })
          console.log('Extracted birthday:', birthdayMatch)
        }
      }

      // Look for reservation data in last few messages for context
      const relevantMessages = conversation
        .filter(msg => msg.role === 'user')
        .slice(-5) // Look at last 5 user messages for complete reservation context
        .map(msg => msg.content)
        .join(' ')

      // Only try to create reservation if we have a customer name
      if (customer.name && customer.name !== 'Hola') {
        const reservationData = this.extractReservationData(relevantMessages)
        console.log('Reservation data extracted:', JSON.stringify(reservationData, null, 2))
        if (reservationData) {
          const reservationId = await this.createReservation(customer, reservationData, businessId, conversation)
          if (reservationId) {
            console.log(`Reservation ${reservationId} created for customer ${customer.name} (${customer.phone_number || customer.phone})`)
          } else {
            console.log('Failed to create reservation - missing required data')
          }
        }
      }

    } catch (error) {
      console.error('Error in data extraction:', error)
    }
  }

  private messageContainsName(text: string): boolean {
    return /me llamo|mi nombre|soy\s+[a-záéíóúñ]|^[a-záéíóúñ]+$/i.test(text) && 
           !/(hola|hi|hello|buenas)/i.test(text)
  }

  private messageContainsBirthday(text: string): boolean {
    return /cumpleaños|nací|nacimiento|\d+.*\d+.*\d+|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i.test(text)
  }


  private extractName(text: string): string | null {
    // Clean the text first
    const cleanText = text.trim()
    
    // More precise name extraction patterns
    const patterns = [
      /mi nombre es\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
      /me llamo\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
      /soy\s+([a-záéíóúñ]+)(?:\s|,|\.|\!|\?|$)/i, // Stop at punctuation or space
      /^([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)$/i // Complete response that's just a name
    ]

    // Words that should NOT be part of names
    const invalidWords = [
      'hola', 'hi', 'hello', 'buenas', 'buenos', 'dias', 'noches', 'tardes',
      'quiero', 'necesito', 'para', 'una', 'mesa', 'reserva', 'booking',
      'que', 'de', 'en', 'con', 'por', 'la', 'el', 'un', 'esta', 'este',
      'y', 'pero', 'entonces', 'ahora', 'despues', 'antes', 'cuando'
    ]

    for (const pattern of patterns) {
      const match = cleanText.match(pattern)
      if (match && match[1]) {
        let nameCandidate = match[1].trim()
        
        // Split into words and validate each one
        const nameWords = nameCandidate.split(/\s+/)
        const validWords = nameWords.filter(word => {
          const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
          return (
            cleanWord.length >= 2 && 
            cleanWord.length <= 15 &&
            /^[a-záéíóúñü]+$/i.test(cleanWord) &&
            !invalidWords.includes(cleanWord)
          )
        })
        
        if (validWords.length > 0 && validWords.length <= 2) {
          const finalName = validWords.join(' ')
          if (finalName.length >= 2 && finalName.length <= 25) {
            return this.capitalizeWords(finalName)
          }
        }
      }
    }
    return null
  }

  private extractBirthday(text: string): string | null {
    try {
      // Simple birthday extraction - focus on working patterns
      const patterns = [
        // DD/MM/YYYY
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
        // DD de marzo de 1990
        /(\d{1,2})\s+de\s+(marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i
      ]

      const monthNames: { [key: string]: string } = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      }

      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match && match[1] && match[2] && match[3]) {
          let day: string, month: string, year: string
          
          if (isNaN(parseInt(match[2]))) {
            // DD de MONTH de YYYY format
            day = match[1].padStart(2, '0')
            month = monthNames[match[2].toLowerCase()] || '01'
            year = match[3]
          } else {
            // DD/MM/YYYY format
            day = match[1].padStart(2, '0')
            month = match[2].padStart(2, '0')
            year = match[3]
          }
          
          // Basic validation
          if (day && month && year &&
              parseInt(day) >= 1 && parseInt(day) <= 31 &&
              parseInt(month) >= 1 && parseInt(month) <= 12 &&
              parseInt(year) >= 1900 && parseInt(year) <= new Date().getFullYear()) {
            return `${year}-${month}-${day}`
          }
        }
      }
    } catch (error) {
      console.log('Error parsing birthday:', error)
    }
    return null
  }

  public extractReservationData(text: string): any | null {
    // Check for reservation keywords or confirmation
    const hasReservation = /reserva|mesa|booking|quiero|necesito.*mesa/i.test(text)
    const isConfirmation = /confirmada|confirmo|perfecto.*reserva|está.*confirmada/i.test(text)
    
    if (!hasReservation && !isConfirmation) return null

    const result: any = { detected: true }

    // Extract number of people - improved patterns
    const peoplePatterns = [
      /(\d+)\s*(persona|gente|mesa para|pax)/i,
      /(seriamos|seremos|somos|vamos a ser)\s+(\d+)/i,
      /para\s+(\d+)\s*(persona|gente)?/i,
      /(\d+)\s*de\s*nosotros/i,
      /mesa\s*para\s*(\d+)/i,
      /reserva\s*para\s*(\d+)/i,
      /(\d+)\s*comensales/i
    ]
    
    for (const pattern of peoplePatterns) {
      const match = text.match(pattern)
      if (match) {
        // For "seriamos 3" pattern, the number is in match[2]
        const number = parseInt(match[2] || match[1] || '0')
        if (number && number > 0 && number <= 20) { // Reasonable range
          result.people = number
          console.log('People extracted:', number, 'from pattern:', pattern.source)
          break
        }
      }
    }

    // Extract time - find all time mentions and prefer the last one
    const timePatterns = [
      // "22hs" or "22h" 
      /(\d{1,2})hs?/g,
      // "8 de la noche" 
      /(\d{1,2})\s+de\s+la\s+(noche|tarde|mañana)/g,
      // "a las 20:00" or "vamos a ir a las 22hs"
      /(?:a las |vamos a ir a las |ir a las )?(\d{1,2}):(\d{2})/g,
      // "a las 8" or "vamos a ir a las 22"
      /(?:a las |vamos a ir a las |ir a las )?(\d{1,2})(?=\s|hs|h|$)/g
    ]

    let extractedTimes = []
    
    for (const pattern of timePatterns) {
      // Reset regex state
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(text)) !== null) {
        let hour = parseInt(match[1] || '0')
        let minute = parseInt(match[2] || '0')
        
        // Handle different time formats
        if (match[3] && match[3].includes('noche') && hour < 12) {
          hour += 12
        } else if (text.includes('noche') && hour < 12) {
          hour += 12
        } else if (match[0].includes('hs') || match[0].includes('h')) {
          // "22hs" is already in 24-hour format, keep as is
        } else if (hour >= 1 && hour <= 11 && !text.includes('mañana')) {
          // Assume PM for restaurant context unless explicitly morning
          if (!text.includes('mañana') && !text.includes('am')) {
            hour += 12
          }
        }
        
        // Validate hour range
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          extractedTimes.push({
            time: timeStr,
            originalText: match[0],
            index: match.index || 0
          })
        }
      }
    }
    
    // If multiple times found, prefer the last one mentioned (usually the actual time they want)
    if (extractedTimes.length > 0) {
      // Sort by index to get chronological order, then take the last one
      extractedTimes.sort((a, b) => a.index - b.index)
      const selectedTime = extractedTimes[extractedTimes.length - 1]
      if (selectedTime) {
        result.time = selectedTime.time
        console.log('Time extracted:', result.time, 'from:', selectedTime.originalText, '(found', extractedTimes.length, 'times total)')
      }
    }

    // Extract date
    const dateMatch = text.match(/(mañana|hoy|esta noche|esta tarde|sábado|domingo|lunes|martes|miércoles|jueves|viernes)/i) ||
                     text.match(/(\d{1,2})[\/\-](\d{1,2})/i)
    
    if (dateMatch) {
      const match = dateMatch[0].toLowerCase()
      if (match.includes('mañana')) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        result.date = tomorrow.toISOString().split('T')[0]
      } else if (match.includes('hoy') || match.includes('esta')) {
        result.date = new Date().toISOString().split('T')[0]
      } else if (match.includes('sábado')) {
        // Find next Saturday
        const nextSaturday = new Date()
        const daysUntilSaturday = (6 - nextSaturday.getDay() + 7) % 7 || 7
        nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday)
        result.date = nextSaturday.toISOString().split('T')[0]
      } else if (match.includes('domingo')) {
        const nextSunday = new Date()
        const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7
        nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
        result.date = nextSunday.toISOString().split('T')[0]
      }
    }

    // Extract occasion
    const occasionMatch = text.match(/(cumpleaños|aniversario|celebrar|celebración|especial)/i)
    if (occasionMatch) {
      result.occasion = occasionMatch[0].toLowerCase()
    }

    return Object.keys(result).length > 1 ? result : null
  }

  private async updateCustomer(customerId: string, updates: Partial<CustomerData>): Promise<void> {
    try {
      await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId)
    } catch (error) {
      console.error('Error updating customer:', error)
    }
  }

  private async createReservation(customer: CustomerData, reservationData: any, businessId: string, conversation: ConversationMessage[]): Promise<string | null> {
    try {
      // Validate required fields
      if (!reservationData.date || !reservationData.time || !reservationData.people) {
        console.log('Incomplete reservation data - missing required fields:', reservationData)
        return null
      }

      // Validate customer has name
      if (!customer.name) {
        console.log('Cannot create reservation - customer has no name:', customer)
        return null
      }

      console.log('Creating reservation with date:', reservationData.date, 'time:', reservationData.time)
      
      // Create datetime with Argentina/Mendoza timezone
      const reservationMoment = moment.tz(
        `${reservationData.date} ${reservationData.time}`,
        'YYYY-MM-DD HH:mm',
        'America/Argentina/Mendoza'
      )
      
      const reservationDateTime = reservationMoment.toDate()
      
      console.log('Combined datetime (Mendoza timezone):', reservationDateTime.toISOString())
      console.log('Local Mendoza time:', reservationMoment.format('YYYY-MM-DD HH:mm:ss Z'))
      
      // Determine reservation type based on business hours and customer intent
      let reservationType = 'cena'
      const hour = parseInt(reservationData.time.split(':')[0])
      const minute = parseInt(reservationData.time.split(':')[1] || '0')
      const totalMinutes = hour * 60 + minute
      
      // Business hours logic:
      // CENA: 20:30 (1230 minutes) to 23:59 (1439 minutes)
      // BAILE: 00:00 (0 minutes) to 06:00 (360 minutes)
      // BAILE TARDÍO: 23:00 onwards if explicitly requested
      const CENA_START = 20 * 60 + 30 // 20:30 = 1230 minutes
      const CENA_END = 23 * 60 + 59   // 23:59 = 1439 minutes
      const BAILE_START = 0           // 00:00 = 0 minutes
      const BAILE_END = 6 * 60        // 06:00 = 360 minutes
      const LATE_BAILE_START = 23 * 60 // 23:00 = 1380 minutes
      
      // Check customer's explicit intent from conversation
      const allUserMessages = conversation
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content.toLowerCase())
        .join(' ')
      
      const explicitlyRequestedBaile = /\b(baile|bailar|boliche|discoteca|dancing|fiesta|party)\b/i.test(allUserMessages)
      const explicitlyRequestedCena = /\b(cena|cenar|comer|comida|mesa|dinner)\b/i.test(allUserMessages)
      
      // Determine type based on time and intent
      if (totalMinutes >= BAILE_START && totalMinutes <= BAILE_END) {
        // 00:00 to 06:00 - Always baile time
        reservationType = 'baile'
        console.log('Time slot: Early morning baile (00:00-06:00)')
      } else if (totalMinutes >= CENA_START && totalMinutes <= CENA_END) {
        // 20:30 to 23:59 - Could be cena or late baile
        if (explicitlyRequestedBaile && totalMinutes >= LATE_BAILE_START) {
          // 23:00+ with explicit baile request
          reservationType = 'baile'
          console.log('Time slot: Late night baile (23:00+) - explicit request')
        } else if (explicitlyRequestedCena || !explicitlyRequestedBaile) {
          // Default to cena unless explicitly requested baile
          reservationType = 'cena'
          console.log('Time slot: Dinner time (20:30-23:59) - default to cena')
        } else {
          // Ambiguous case - default to cena but mention both options
          reservationType = 'cena'
          console.log('Time slot: Ambiguous time - defaulting to cena')
        }
      } else if (totalMinutes < CENA_START) {
        // Before 20:30 - Too early for normal service
        reservationType = 'cena'
        console.log('Time slot: Before normal hours - defaulting to cena')
      } else {
        // After 23:59 and before 00:00 (shouldn't happen but safety)
        reservationType = explicitlyRequestedBaile ? 'baile' : 'cena'
        console.log('Time slot: Edge case - using customer intent')
      }
      
      // Additional validation: suggest alternative if time doesn't match typical service
      let suggestAlternative = false
      if (reservationType === 'cena' && explicitlyRequestedBaile && totalMinutes < LATE_BAILE_START) {
        suggestAlternative = true
      } else if (reservationType === 'baile' && explicitlyRequestedCena && totalMinutes >= CENA_START && totalMinutes <= CENA_END) {
        suggestAlternative = true
      }
      
      console.log('Reservation type determined:', reservationType, 'for time:', reservationData.time, `(${totalMinutes} minutes)`)
      
      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert([{
          business_id: businessId,
          customer_id: customer.id,
          reservation_type: reservationType,
          reservation_date: reservationDateTime.toISOString(),
          party_size: reservationData.people,
          status: 'confirmed',
          customer_name: customer.name || 'Cliente WhatsApp',
          phone: customer.phone_number || customer.phone || '',
          special_requests: reservationData.occasion ? `Ocasión especial: ${reservationData.occasion}` : 'Reserva via WhatsApp bot'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating reservation:', error)
        return null
      }

      console.log('Reservation created successfully:', reservation)
      return reservation.id
    } catch (error) {
      console.error('Error in createReservation:', error)
      return null
    }
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )
  }

  private addToConversation(phoneNumber: string, message: ConversationMessage): void {
    if (!this.conversations.has(phoneNumber)) {
      this.conversations.set(phoneNumber, [])
    }
    
    const conversation = this.conversations.get(phoneNumber)!
    message.timestamp = new Date()
    conversation.push(message)

    // Keep only last 20 messages per conversation
    if (conversation.length > 20) {
      conversation.splice(0, conversation.length - 20)
    }
  }

  private getConversation(phoneNumber: string): ConversationMessage[] {
    return this.conversations.get(phoneNumber) || []
  }

  private cleanupOldConversations(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    for (const [number, conversation] of this.conversations.entries()) {
      const lastMessage = conversation[conversation.length - 1]
      if (lastMessage?.timestamp && lastMessage.timestamp < oneHourAgo) {
        this.conversations.delete(number)
      }
    }
  }

  // Method to handle immediate responses (for testing)
  async processImmediateMessage(
    phoneNumber: string, 
    message: string, 
    businessId: string
  ): Promise<string> {
    this.addToConversation(phoneNumber, { role: 'user', content: message })
    return await this.generateResponse(phoneNumber, businessId)
  }

  // Get customer VIP level based on points
  private getCustomerLevel(points: number): string {
    if (points >= 3000) return 'Oro'
    if (points >= 1500) return 'Plata'
    if (points >= 500) return 'Bronce'
    return 'Cliente Regular'
  }

  // Get loyalty settings for business
  private async getLoyaltySettings(businessId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('business_id', businessId)
        .single()

      if (error) return null
      return data
    } catch (error) {
      console.error('Error getting loyalty settings:', error)
      return null
    }
  }

  // Get redeemable items for customer points consultation
  private async getRedeemableItems(businessId: string, customerPoints: number): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('redeemable_items')
        .select('name, points_required, description')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .lte('points_required', customerPoints + 200) // Show items within reach
        .order('points_required', { ascending: true })
        .limit(5)

      if (error || !data || data.length === 0) {
        return "Consulta en el local por los productos disponibles para canje."
      }

      let itemsList = "🎁 Con tus puntos puedes canjear:\n\n"
      data.forEach(item => {
        const canAfford = customerPoints >= item.points_required
        const status = canAfford ? '✅' : '⏳'
        itemsList += `${status} ${item.name} - ${item.points_required} pts\n`
        if (item.description) {
          itemsList += `   ${item.description}\n`
        }
        itemsList += '\n'
      })

      return itemsList
    } catch (error) {
      console.error('Error getting redeemable items:', error)
      return "Consulta en el local por los productos disponibles para canje."
    }
  }

  // Enhanced data extraction with points queries
  private async processPointsQuery(phoneNumber: string, businessId: string): Promise<string | null> {
    try {
      const customer = await this.getOrCreateCustomer(phoneNumber, businessId)
      
      if (!customer || !customer.name) {
        return "Para consultar tus puntos, necesito que me digas tu nombre primero. ¿Cómo te llamas?"
      }

      const points = customer.points || 0
      const level = this.getCustomerLevel(points)
      const redeemableItems = await this.getRedeemableItems(businessId, points)
      
      let response = `🌟 ¡Hola ${customer.name}!\n\n`
      response += `💎 Puntos actuales: ${points}\n`
      response += `🏆 Nivel: ${level}\n`
      response += `🎯 Visitas: ${customer.visit_count || 0}\n\n`
      
      if (points > 0) {
        response += redeemableItems
        response += "\n💡 ¿Te interesa canjear algún producto?"
      } else {
        response += "¡Aún no tienes puntos! Empezarás a ganar puntos con tu próxima visita. 🎉"
      }

      return response
    } catch (error) {
      console.error('Error processing points query:', error)
      return null
    }
  }
}