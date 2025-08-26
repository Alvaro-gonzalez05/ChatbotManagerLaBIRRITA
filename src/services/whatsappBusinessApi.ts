import axios, { AxiosInstance } from 'axios'
import { getTemplateConfig, buildTemplateComponents, validateTemplateParameters } from '@/lib/whatsapp-templates'

export interface WhatsAppBusinessMessage {
  messaging_product: 'whatsapp'
  to: string
  type: 'text' | 'template'
  text?: {
    body: string
  }
  template?: {
    name: string
    language: {
      code: string
    }
    components: Array<{
      type: 'header' | 'body' | 'footer' | 'button'
      parameters: Array<{
        type: 'text'
        text: string
      }>
    }>
  }
}

export interface WhatsAppWebhookMessage {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text: {
            body: string
          }
          type: string
        }>
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

export class WhatsAppBusinessApiService {
  private client: AxiosInstance
  private accessToken: string
  private phoneNumberId: string
  private verifyToken: string
  private version: string

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token'
    this.version = process.env.WHATSAPP_API_VERSION || 'v19.0'
    
    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.version}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async sendTemplate(to: string, templateName: string = 'hello_world', languageCode: string = 'en_US'): Promise<any> {
    try {
      // Clean the phone number (remove special characters, spaces, etc.)
      const cleanNumber = to.replace(/\D/g, '')
      // For Argentina, ensure it starts with 54
      const formattedNumber = cleanNumber.startsWith('54') ? cleanNumber : `54${cleanNumber}`

      const templateData = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, templateData)
      return response.data
    } catch (error: any) {
      console.error('Error sending WhatsApp template:', error.response?.data || error.message)
      throw new Error('Failed to send WhatsApp template')
    }
  }

  async sendTemplateWithParameters(to: string, templateName: string, parameters: string[] = [], languageCode: string = 'es'): Promise<any> {
    try {
      // Clean the phone number (remove special characters, spaces, etc.)
      const cleanNumber = to.replace(/\D/g, '')
      // For Argentina, ensure it starts with 54
      const formattedNumber = cleanNumber.startsWith('54') ? cleanNumber : `54${cleanNumber}`

      // Get template configuration
      const templateConfig = getTemplateConfig(templateName)
      if (!templateConfig) {
        throw new Error(`Plantilla ${templateName} no encontrada en configuración`)
      }

      // Validate parameters
      if (!validateTemplateParameters(templateName, parameters)) {
        const expectedParams = templateConfig.headerParameters + templateConfig.bodyParameters
        throw new Error(`Plantilla ${templateName} requiere ${expectedParams} parámetros, recibidos ${parameters.length}`)
      }

      // Build components using configuration
      const components = buildTemplateComponents(templateName, parameters)

      const templateData = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateConfig.language
          },
          components: components.length > 0 ? components : undefined
        }
      }

      console.log(`🤖 Enviando plantilla ${templateName} a ${formattedNumber}`)
      console.log(`📋 Parámetros (${parameters.length}):`, parameters)
      console.log(`🔧 Configuración:`, templateConfig)
      console.log(`📨 Template data:`, JSON.stringify(templateData, null, 2))

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, templateData)
      console.log('✅ Respuesta de WhatsApp:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp template with parameters:', error.response?.data || error.message)
      console.error('📋 Template info:', {
        name: templateName,
        parameters,
        to: to,
        parameterCount: parameters.length
      })
      
      // Return more detailed error info
      const cleanNum = to.replace(/\D/g, '')
      const finalNumber = cleanNum.startsWith('54') ? cleanNum : `54${cleanNum}`
      
      return {
        error: true,
        message: error.response?.data?.error?.message || error.message,
        details: error.response?.data || error.message,
        templateName,
        to: finalNumber
      }
    }
  }

  async sendMessage(to: string, message: string): Promise<any> {
    try {
      // Clean the phone number (remove special characters, spaces, etc.)
      const cleanNumber = to.replace(/\D/g, '')
      // For Argentina, ensure it starts with 54
      const formattedNumber = cleanNumber.startsWith('54') ? cleanNumber : `54${cleanNumber}`

      const messageData: WhatsAppBusinessMessage = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: message
        }
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, messageData)
      return response.data
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message)
      throw new Error('Failed to send WhatsApp message')
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.client.get(`/${this.phoneNumberId}`)
      return response.data
    } catch (error: any) {
      console.error('Error getting WhatsApp profile:', error.response?.data || error.message)
      throw new Error('Failed to get WhatsApp profile')
    }
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
      return true
    } catch (error: any) {
      console.error('Error marking message as read:', error.response?.data || error.message)
      return false
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('Webhook verified successfully')
      return challenge
    } else {
      console.log('Webhook verification failed')
      return null
    }
  }

  processWebhookMessage(body: WhatsAppWebhookMessage): any {
    try {
      if (body.object !== 'whatsapp_business_account') {
        return null
      }

      const entry = body.entry?.[0]
      if (!entry) return null
      
      const changes = entry.changes?.[0]
      if (!changes) return null
      
      if (changes.field !== 'messages') {
        return null
      }

      const messages = changes.value.messages
      if (!messages || messages.length === 0) {
        return null
      }

      const message = messages[0]
      if (!message) return null
      
      return {
        messageId: message.id,
        from: message.from,
        text: message.text?.body || '',
        timestamp: message.timestamp,
        phoneNumberId: changes.value.metadata?.phone_number_id,
        displayPhoneNumber: changes.value.metadata?.display_phone_number
      }
    } catch (error: any) {
      console.error('Error processing webhook message:', error)
      return null
    }
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId)
  }
}