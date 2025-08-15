import { NextRequest, NextResponse } from 'next/server'
import { BotService } from '@/services/botService'
import { EvolutionApiService, WhatsAppMessage } from '@/services/evolutionApi'
import { WhatsAppBusinessApiService, WhatsAppWebhookMessage } from '@/services/whatsappBusinessApi'
import { AIService } from '@/services/aiService'

const botService = new BotService()
const evolutionApi = new EvolutionApiService()
const whatsappBusinessApi = new WhatsAppBusinessApiService()
const aiService = new AIService()

// WhatsApp Business API webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verificationResult = whatsappBusinessApi.verifyWebhook(
    mode as string, 
    token as string, 
    challenge as string
  )

  if (verificationResult) {
    return new NextResponse(verificationResult, { status: 200 })
  } else {
    return new NextResponse('Verification failed', { status: 403 })
  }
}

// WhatsApp webhook to receive messages (supports both APIs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received webhook:', JSON.stringify(body, null, 2))
    
    // Check if it's WhatsApp Business API format
    if (body.object === 'whatsapp_business_account') {
      await handleWhatsAppBusinessWebhook(body)
      return NextResponse.json({ status: 'success' })
    }

    // Handle Evolution API format
    const { event, instance, data } = body
    switch (event) {
      case 'QRCODE_UPDATED':
        console.log(`QR Code updated for instance ${instance.instanceName}`)
        break

      case 'CONNECTION_UPDATE':
        console.log(`Connection update for instance ${instance.instanceName}:`, data.state)
        break

      case 'MESSAGES_UPSERT':
        if (data && data.length > 0) {
          for (const messageData of data) {
            await handleIncomingMessage(instance.instanceName, messageData)
          }
        }
        break

      case 'APPLICATION_STARTUP':
        console.log(`Application started for instance ${instance.instanceName}`)
        break

      default:
        console.log(`Unhandled event: ${event}`)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ status: 'error', message: error.message })
  }
}

async function handleWhatsAppBusinessWebhook(body: WhatsAppWebhookMessage) {
  try {
    const messageData = whatsappBusinessApi.processWebhookMessage(body)
    
    if (!messageData) {
      console.log('No message data to process')
      return
    }

    const { from, text, messageId } = messageData
    
    if (!text.trim()) {
      return // Skip empty messages
    }

    console.log(`Processing WhatsApp Business API message from ${from}: ${text}`)

    // Mark message as read
    await whatsappBusinessApi.markMessageAsRead(messageId)

    // Extract business ID from phone number context
    const businessId = await getBusinessIdFromContext(from)
    
    if (!businessId) {
      console.log(`No business ID found for number ${from}`)
      return
    }

    // Process with AI service (includes delay)
    const result = await aiService.processMessage(from, text, businessId)
    
    if (result.response) {
      try {
        await whatsappBusinessApi.sendMessage(from, result.response)
        console.log(`Sent AI response to ${from}: ${result.response}`)
      } catch (error: any) {
        console.error('Error sending response:', error)
      }
    }
  } catch (error: any) {
    console.error('Error handling WhatsApp Business webhook:', error)
  }
}

async function handleIncomingMessage(instanceName: string, messageData: WhatsAppMessage) {
  try {
    // Only process messages from customers (not from us)
    if (!evolutionApi.isFromCustomer(messageData)) {
      return
    }

    const messageText = evolutionApi.extractMessageText(messageData)
    if (!messageText.trim()) {
      return // Skip empty messages
    }

    const customerNumber = evolutionApi.getCustomerNumber(messageData)
    
    console.log(`Processing Evolution API message from ${customerNumber}: ${messageText}`)

    // Extract business ID from instance name
    const businessId = extractBusinessIdFromInstance(instanceName)
    
    if (businessId) {
      // Use AI service for intelligent responses
      const result = await aiService.processMessage(customerNumber, messageText, businessId)
      
      if (result.response) {
        try {
          await botService.sendMessage(instanceName, customerNumber, result.response)
          console.log(`Sent AI response to ${customerNumber}: ${result.response}`)
        } catch (error: any) {
          console.error('Error sending response:', error)
        }
      }
    } else {
      // Fallback to simple bot service
      const response = await botService.processMessage(instanceName, customerNumber, messageText)
      
      if (response) {
        setTimeout(async () => {
          try {
            await botService.sendMessage(instanceName, customerNumber, response)
            console.log(`Sent response to ${customerNumber}: ${response}`)
          } catch (error: any) {
            console.error('Error sending response:', error)
          }
        }, 1000)
      }
    }
  } catch (error: any) {
    console.error('Error handling incoming message:', error)
  }
}

function extractBusinessIdFromInstance(instanceName: string): string | null {
  const match = instanceName.match(/business-(.+)-bot/)
  return match?.[1] ?? null
}

async function getBusinessIdFromContext(_phoneNumber: string): Promise<string | null> {
  // For now, return a default business ID
  // In production, you might want to:
  // 1. Check which business owns the WhatsApp number being contacted
  // 2. Look up business based on webhook endpoint
  // 3. Use a mapping table
  return '1' // Default to business ID 1 for testing
}