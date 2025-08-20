import { NextRequest, NextResponse } from 'next/server'
import { BotService } from '@/services/botService'
import { WhatsAppService, WhatsAppWebhook } from '@/services/whatsappService'
import { createClient } from '@/lib/supabase'

const botService = new BotService()
const whatsappService = new WhatsAppService()

// WhatsApp Business API webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token && challenge) {
    const verifiedChallenge = whatsappService.verifyWebhook(mode, token, challenge)
    
    if (verifiedChallenge) {
      console.log('Webhook verified successfully')
      return new NextResponse(verifiedChallenge)
    } else {
      console.error('Webhook verification failed')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  
  return NextResponse.json({ status: 'WhatsApp webhook endpoint active' })
}

// WhatsApp Business API webhook to receive messages
export async function POST(request: NextRequest) {
  try {
    const webhookData: WhatsAppWebhook = await request.json()
    console.log('Received WhatsApp webhook:', JSON.stringify(webhookData, null, 2))

    // Procesar mensajes del webhook
    const messages = whatsappService.processWebhook(webhookData)

    for (const { phoneNumberId, message, customerName } of messages) {
      // Solo procesar mensajes de clientes (no enviados por el bot)
      if (whatsappService.isFromCustomer(message)) {
        const messageText = whatsappService.extractMessageText(message)
        const customerNumber = whatsappService.getCustomerNumber(message)

        console.log(`Processing message from ${customerNumber}: "${messageText}"`)

        if (messageText.trim()) {
          try {
            // Intentar encontrar la configuración de WhatsApp y el business asociado
            let businessId = null
            try {
              const supabase = createClient()
              const { data: config, error } = await supabase
                .from('whatsapp_configurations')
                .select('business_id')
                .eq('phone_number_id', phoneNumberId)
                .single()

              if (!error && config) {
                businessId = config.business_id
              }
            } catch (dbError) {
              console.warn('Database access failed for webhook:', dbError)
            }

            // Si no se encuentra en la DB, usar el businessId por defecto
            if (!businessId) {
              const defaultPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '793528520499781'
              if (phoneNumberId === defaultPhoneNumberId) {
                businessId = 'f2a24619-5016-490c-9dc9-dd08fd6549b3' // Business ID por defecto
              } else {
                console.warn('Could not find business for phone number ID:', phoneNumberId)
                continue
              }
            }

            // Marcar mensaje como leído
            await whatsappService.markAsRead(phoneNumberId, message.id)

            // Generar respuesta del bot
            const botResponse = await botService.processMessage(
              messageText,
              customerNumber,
              businessId,
              customerName || 'Cliente'
            )

            console.log(`Bot response: "${botResponse}"`)

            // Enviar respuesta
            if (botResponse && botResponse.trim()) {
              await whatsappService.sendTextMessage(phoneNumberId, customerNumber, botResponse)
              console.log(`Response sent to ${customerNumber}`)
            }

          } catch (error) {
            console.error('Error processing message:', error)
            
            // Enviar mensaje de error
            try {
              await whatsappService.sendTextMessage(
                phoneNumberId,
                customerNumber,
                'Disculpa, hubo un error procesando tu mensaje. Por favor intenta nuevamente.'
              )
            } catch (fallbackError) {
              console.error('Error sending fallback message:', fallbackError)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

