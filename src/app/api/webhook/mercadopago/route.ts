import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/services/mercadoPagoService'
import { WhatsAppService } from '@/services/whatsappService'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Usar Service Role Key para bypasear RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const mercadoPagoService = new MercadoPagoService()
const whatsappService = new WhatsAppService()

// MercadoPago webhook verification (GET method for challenge verification)
export async function GET(request: NextRequest) {
  console.log('� GET REQUEST ON MERCADOPAGO WEBHOOK 🚨')
  console.log('🔗 Full URL:', request.url)
  console.log('👤 User-Agent:', request.headers.get('user-agent'))
  
  const url = new URL(request.url)
  const searchParams = url.searchParams
  
  // Log all query parameters for debugging
  console.log('🔍 GET parameters:', Object.fromEntries(searchParams.entries()))
  
  // MercadoPago puede enviar un challenge para verificar el webhook
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    console.log('✅ MercadoPago webhook verification challenge received:', challenge)
    return new NextResponse(challenge)
  }
  
  // Check if this is a payment success callback (sometimes MP sends via GET)
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const status = searchParams.get('status')
  const externalRef = searchParams.get('external_reference')
  
  if (paymentId && status === 'approved' && externalRef) {
    console.log('💳 Payment success detected via GET callback:')
    console.log(`   - Payment ID: ${paymentId}`)
    console.log(`   - Status: ${status}`)
    console.log(`   - External Reference: ${externalRef}`)
    
    // Process this payment like a webhook
    try {
      const paymentInfo = await mercadoPagoService.buscarPagoPorId(paymentId)
      if (paymentInfo && paymentInfo.status === 'approved') {
        console.log('✅ Processing payment from GET callback')
        const result = await processApprovedPayment(paymentInfo)
        return NextResponse.json({ 
          status: 'payment processed via GET',
          payment_id: paymentId,
          result: result,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('❌ Error processing GET payment callback:', error)
    }
  }
  
  // Si no hay challenge ni payment callback, mostrar status
  return NextResponse.json({ 
    status: 'MercadoPago webhook endpoint active',
    timestamp: new Date().toISOString(),
    method: 'GET'
  })
}

// MercadoPago webhook to receive payment notifications (POST method)
export async function POST(request: NextRequest) {
  console.log('�🚨🚨 POST REQUEST RECEIVED ON MERCADOPAGO WEBHOOK 🚨🚨🚨')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🌍 URL:', request.url)
  console.log('🔗 Origin:', request.headers.get('origin'))
  console.log('👤 User-Agent:', request.headers.get('user-agent'))
  
  try {
    // Obtener el cuerpo de la request como texto para logging
    let body: string = ''
    try {
      body = await request.text()
      console.log('📄 Raw webhook body:', body)
    } catch (error) {
      console.error('❌ Error reading request body:', error)
      return NextResponse.json({ 
        error: 'Invalid request body',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Validar que el body no esté vacío
    if (!body || body.trim() === '') {
      console.log('⚠️  Empty request body received')
      return NextResponse.json({ 
        status: 'empty body received',
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    // Headers para debugging
    const headers = Object.fromEntries(request.headers.entries())
    console.log('📋 Request headers:', headers)

    // Intentar parsear el JSON
    let webhookData: any
    try {
      webhookData = JSON.parse(body)
      console.log('📱 Parsed MercadoPago webhook data:', JSON.stringify(webhookData, null, 2))
    } catch (parseError) {
      console.error('❌ Error parsing JSON:', parseError)
      console.log('📄 Body content was:', body)
      return NextResponse.json({ 
        error: 'Invalid JSON format',
        body: body,
        timestamp: new Date().toISOString()
      }, { status: 200 }) // Return 200 to avoid retries
    }

    // Validar estructura básica del webhook
    if (!webhookData) {
      console.log('⚠️  No webhook data received')
      return NextResponse.json({ 
        status: 'no data received',
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    // Log detailed webhook info
    console.log('🔍 Webhook analysis:')
    console.log('   - action:', webhookData.action)
    console.log('   - type:', webhookData.type)
    console.log('   - data:', webhookData.data)
    console.log('   - live_mode:', webhookData.live_mode)

    // Verificar que es una notificación de pago (ambos formatos)
    const isPaymentNotification = (
      (webhookData.type === 'payment') || 
      (webhookData.action && webhookData.action.includes('payment'))
    )

    if (!isPaymentNotification) {
      console.log(`ℹ️  Received non-payment webhook: type=${webhookData.type}, action=${webhookData.action}`)
      return NextResponse.json({ 
        status: 'ignored - not a payment notification',
        type: webhookData.type,
        action: webhookData.action,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    // Extraer payment ID
    let paymentId: string = ''
    if (webhookData.data && webhookData.data.id) {
      paymentId = webhookData.data.id.toString()
    } else if (webhookData.id) {
      paymentId = webhookData.id.toString()
    }

    if (!paymentId) {
      console.log('⚠️  No payment ID found in webhook')
      return NextResponse.json({ 
        status: 'no payment id found',
        webhook_data: webhookData,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    console.log(`💳 Processing payment notification: ${paymentId}`)
    console.log(`🔍 Payment details:`)
    console.log(`   - Live mode: ${webhookData.live_mode}`)
    console.log(`   - Payment ID: ${paymentId}`)
    console.log(`   - Action: ${webhookData.action}`)
    console.log(`   - Type: ${webhookData.type}`)

    // Solo considerar como prueba si es el ID específico de prueba de MP Dashboard (123456)
    // O si está marcado explícitamente como test
    if (paymentId === '123456' || (webhookData.live_mode === false && paymentId.length < 8)) {
      console.log('🧪 Test payment detected, returning success')
      return NextResponse.json({ 
        status: 'test payment processed',
        payment_id: paymentId,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    console.log(`💰 Processing REAL payment: ${paymentId}`)

    // Buscar el pago en MercadoPago
    let paymentInfo
    try {
      console.log(`🔍 Searching for payment in MercadoPago: ${paymentId}`)
      paymentInfo = await mercadoPagoService.buscarPagoPorId(paymentId)
    } catch (error: any) {
      console.error('❌ Error searching payment in MercadoPago:', error)
      return NextResponse.json({ 
        status: 'error searching payment',
        payment_id: paymentId,
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 200 }) // Return 200 to avoid retries
    }

    if (!paymentInfo) {
      console.log(`❌ Payment not found: ${paymentId}`)
      return NextResponse.json({ 
        status: 'payment not found', 
        payment_id: paymentId,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    console.log(`💰 Payment found:`)
    console.log(`   - ID: ${paymentInfo.id}`)
    console.log(`   - Status: ${paymentInfo.status}`)
    console.log(`   - Amount: $${paymentInfo.amount}`)
    console.log(`   - External Reference: ${paymentInfo.external_reference}`)

    // Solo procesar pagos aprobados
    if (paymentInfo.status !== 'approved') {
      console.log(`⏳ Payment ${paymentId} status: ${paymentInfo.status} (not approved yet)`)
      return NextResponse.json({ 
        status: 'payment not approved yet',
        payment_id: paymentId,
        payment_status: paymentInfo.status,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    }

    // Procesar pago aprobado
    console.log(`✅ Payment approved: ${paymentId}`)
    const result = await processApprovedPayment(paymentInfo)
    
    return NextResponse.json({ 
      status: 'success',
      payment_id: paymentId,
      result: result,
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error: any) {
    console.error('💥 Critical error processing MercadoPago webhook:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 }) // Return 200 to avoid retries
  }
}

// Función para procesar pago aprobado
async function processApprovedPayment(paymentInfo: any): Promise<any> {
  console.log(`🔄 Processing approved payment: ${paymentInfo.id}`)
  
  const customerPhone = paymentInfo.external_reference
  
  if (!customerPhone) {
    console.log(`❌ No external_reference found in payment`)
    return { status: 'no external reference' }
  }

  try {
    // Buscar contexto de conversación para este teléfono
    console.log(`🔍 Searching conversation context for phone: ${customerPhone}`)
    const { data: contexts } = await supabase
      .from('conversation_context')
      .select('*')
      .eq('customer_phone', customerPhone)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log(`📊 Found ${contexts?.length || 0} pending reservations for phone ${customerPhone}`)

    if (contexts && contexts.length > 0) {
      const matchingContext = contexts[0] // Tomar la más reciente

      console.log(`🎯 Processing reservation for:`)
      console.log(`   - Customer: ${matchingContext.customer_name}`)
      console.log(`   - Phone: ${matchingContext.customer_phone}`)
      console.log(`   - Day: ${matchingContext.reservation_day}`)
      console.log(`   - People: ${matchingContext.reservation_people}`)

      // Obtener información del negocio
      const { data: businessInfo } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', matchingContext.business_id)
        .single()

      if (businessInfo) {
        console.log(`🏢 Business info found: ${businessInfo.name}`)
        
        // Guardar la reserva
        const reservationResult = await saveReservation(matchingContext, paymentInfo, businessInfo)
        
        if (reservationResult.success) {
          // Enviar confirmación por WhatsApp
          await sendWhatsAppConfirmation(matchingContext, paymentInfo, businessInfo)
          
          return {
            status: 'reservation_confirmed',
            reservation_id: reservationResult.reservation_id,
            customer: customerPhone
          }
        }
      }
    }

    return { status: 'no matching reservation found' }

  } catch (error: any) {
    console.error('❌ Error processing approved payment:', error)
    return { status: 'error', message: error.message }
  }
}

// Funciones auxiliares para parseo de fechas
function parseSpecificDate(dayString: string, today: Date): Date {
  const monthNames: { [key: string]: number } = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  }
  
  // Patrón para "15 de septiembre", "para el 20 de octubre", etc.
  const match = dayString.match(/(?:para el )?(\d{1,2})\s+de\s+([a-záéíóúñ]+)/)
  if (match) {
    const day = parseInt(match[1])
    const monthName = match[2].toLowerCase()
    const monthIndex = monthNames[monthName]
    
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const currentYear = today.getFullYear()
      const targetDate = new Date(currentYear, monthIndex, day)
      
      // Si la fecha ya pasó este año, usar el próximo año
      if (targetDate < today) {
        targetDate.setFullYear(currentYear + 1)
      }
      
      console.log(`📅 Parsed specific date: ${dayString} -> ${targetDate.toDateString()}`)
      return targetDate
    }
  }
  
  // Si no se puede parsear, retornar mañana por defecto
  console.log(`⚠️ Could not parse specific date: ${dayString}, using tomorrow`)
  return new Date(today.getTime() + 24 * 60 * 60 * 1000)
}

function parseNumericDate(dayString: string, today: Date): Date {
  // Patrones para "15/09", "15-09", "15/09/25", etc.
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})$/, // DD/MM o DD-MM
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/ // DD/MM/YY o DD/MM/YYYY
  ]
  
  for (const pattern of patterns) {
    const match = dayString.match(pattern)
    if (match) {
      const day = parseInt(match[1])
      const month = parseInt(match[2]) - 1 // Months are 0-indexed
      let year = today.getFullYear()
      
      if (match[3]) {
        year = parseInt(match[3])
        // Si el año es de 2 dígitos, asumir 20XX
        if (year < 100) {
          year = 2000 + year
        }
      }
      
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const targetDate = new Date(year, month, day)
        
        // Si no se especificó año y la fecha ya pasó, usar el próximo año
        if (!match[3] && targetDate < today) {
          targetDate.setFullYear(year + 1)
        }
        
        console.log(`📅 Parsed numeric date: ${dayString} -> ${targetDate.toDateString()}`)
        return targetDate
      }
    }
  }
  
  // Si no se puede parsear, retornar mañana por defecto
  console.log(`⚠️ Could not parse numeric date: ${dayString}, using tomorrow`)
  return new Date(today.getTime() + 24 * 60 * 60 * 1000)
}

// Función para guardar reserva
async function saveReservation(context: any, paymentInfo: any, businessInfo: any): Promise<any> {
  try {
    console.log(`💾 Saving reservation to database...`)
    
    // Preparar fecha de reserva
    let reservationDate = new Date().toISOString()
    if (context.reservation_day && context.reservation_time) {
      const dayMap: { [key: string]: number } = {
        'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6, 'domingo': 0
      }
      
      const today = new Date()
      const reservationDay = context.reservation_day.toLowerCase()
      let targetDate: Date
      
      // Manejar casos especiales primero
      if (reservationDay === 'hoy') {
        targetDate = new Date(today)
      } else if (reservationDay === 'mañana') {
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000) // +1 día
      } else if (reservationDay === 'pasado mañana') {
        targetDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) // +2 días
      } else if (reservationDay.includes(' de ')) {
        // Manejar fechas específicas como "15 de septiembre", "20 de octubre"
        targetDate = parseSpecificDate(reservationDay, today)
      } else if (reservationDay.includes('/') || reservationDay.includes('-')) {
        // Manejar fechas numéricas como "15/09", "20-10"
        targetDate = parseNumericDate(reservationDay, today)
      } else {
        // Para días específicos de la semana
        const targetDay = dayMap[reservationDay]
        if (targetDay !== undefined) {
          const daysUntilTarget = (targetDay - today.getDay() + 7) % 7 || 7
          targetDate = new Date(today.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000)
        } else {
          // Si no se puede interpretar el día, usar mañana por defecto
          console.log(`⚠️ Unknown day format: ${context.reservation_day}, using tomorrow as default`)
          targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
      
      // Establecer la hora específica
      const [hours, minutes] = (context.reservation_time || '21:00').split(':')
      targetDate.setHours(parseInt(hours) || 21, parseInt(minutes) || 0, 0, 0)
      reservationDate = targetDate.toISOString()
      
      console.log(`📅 Parsed reservation date: ${context.reservation_day} ${context.reservation_time} -> ${reservationDate}`)
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        business_id: context.business_id,
        phone: context.customer_phone,
        customer_name: context.customer_name || 'Cliente',
        reservation_date: reservationDate,
        reservation_type: context.reservation_type || 'cena',
        party_size: context.reservation_people || 1,
        status: 'confirmed',
        deposit_paid: true,
        deposit_method: 'mercadopago',
        deposit_amount: paymentInfo.amount,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error saving reservation:`, error)
      return { success: false, error: error }
    }

    console.log(`✅ Reservation saved: ${reservation.id}`)

    // Limpiar contexto
    await supabase
      .from('conversation_context')
      .delete()
      .eq('id', context.id)

    console.log(`🧹 Context cleaned`)

    return { success: true, reservation_id: reservation.id }

  } catch (error) {
    console.error('❌ Error in saveReservation:', error)
    return { success: false, error: error }
  }
}

// Función para enviar confirmación por WhatsApp
async function sendWhatsAppConfirmation(context: any, paymentInfo: any, businessInfo: any): Promise<void> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!
    
    const confirmationMessage = `🎉 **¡PAGO RECIBIDO!** 🎉

✅ **RESERVA CONFIRMADA AUTOMÁTICAMENTE** ✅

📅 **${context.reservation_day?.toUpperCase()}** ${context.reservation_time ? `a las ${context.reservation_time}` : ''}
👥 **${context.reservation_people} personas**
🍽️ **Para ${context.reservation_type || 'cena'}**

💳 **Pago #${paymentInfo.id}**
💰 **Monto: $${paymentInfo.amount}**
📱 **A nombre de: ${context.customer_name}**

¡Tu pago fue detectado automáticamente! 
Te esperamos en ${businessInfo.name}. 🍻

¡Gracias por elegirnos! 🙌`

    console.log(`📱 Sending WhatsApp confirmation to: ${context.customer_phone}`)
    
    await whatsappService.sendTextMessage(phoneNumberId, context.customer_phone, confirmationMessage)
    console.log(`✅ WhatsApp confirmation sent successfully`)

  } catch (error) {
    console.error('❌ Error sending WhatsApp confirmation:', error)
  }
}
