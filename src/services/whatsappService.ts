import axios, { AxiosInstance } from 'axios'

export interface WhatsAppInstance {
  businessId: string
  phoneNumberId: string
  status: 'connected' | 'disconnected' | 'pending'
  phoneNumber?: string
  displayName?: string
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  text?: {
    body: string
  }
  image?: {
    id: string
    mime_type: string
    sha256: string
  }
}

export interface WhatsAppWebhook {
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
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: WhatsAppMessage[]
      }
      field: string
    }>
  }>
}

export class WhatsAppService {
  private client: AxiosInstance
  private accessToken: string
  private verifyToken: string
  private version: string

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ''
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'mi_token_verificacion_seguro'
    this.version = process.env.WHATSAPP_API_VERSION || 'v18.0'
    
    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.version}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  // Verificar webhook de WhatsApp
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge
    }
    return null
  }

  // Enviar mensaje de texto
  async sendTextMessage(phoneNumberId: string, to: string, message: string): Promise<any> {
    try {
      // Normalizar número argentino para Meta (quitar el 9 si está presente)
      let normalizedTo = to
      if (to.startsWith('549')) {
        normalizedTo = to.replace('549', '54')
        console.log(`📱 Normalizando número: ${to} → ${normalizedTo}`)
      }

      const response = await this.client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: {
          body: message
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error sending WhatsApp message:')
      console.error('- Status:', error.response?.status)
      console.error('- Status Text:', error.response?.statusText)
      console.error('- Data:', error.response?.data)
      console.error('- Message:', error.message)
      console.error('- Full error:', error)
      throw new Error('Failed to send WhatsApp message')
    }
  }

  // Enviar mensaje con botones
  async sendButtonMessage(phoneNumberId: string, to: string, text: string, buttons: Array<{id: string, title: string}>): Promise<any> {
    try {
      const response = await this.client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: text
          },
          action: {
            buttons: buttons.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title
              }
            }))
          }
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error sending WhatsApp button message:', error.response?.data || error.message)
      throw new Error('Failed to send WhatsApp button message')
    }
  }

  // Enviar mensaje con lista
  async sendListMessage(phoneNumberId: string, to: string, text: string, buttonText: string, sections: Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>): Promise<any> {
    try {
      const response = await this.client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: text
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error sending WhatsApp list message:', error.response?.data || error.message)
      throw new Error('Failed to send WhatsApp list message')
    }
  }

  // Marcar mensaje como leído
  async markAsRead(phoneNumberId: string, messageId: string): Promise<boolean> {
    try {
      await this.client.post(`/${phoneNumberId}/messages`, {
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

  // Obtener información del perfil del negocio
  async getBusinessProfile(phoneNumberId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${phoneNumberId}`, {
        params: {
          fields: 'display_phone_number,verified_name,messaging_limit_tier'
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error getting business profile:', error.response?.data || error.message)
      throw new Error('Failed to get business profile')
    }
  }

  // Obtener información de la aplicación
  async getAppInfo(): Promise<any> {
    try {
      const response = await this.client.get('/me', {
        params: {
          fields: 'name,category'
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error getting app info:', error.response?.data || error.message)
      throw new Error('Failed to get app info')
    }
  }

  // Validar número de teléfono
  validatePhoneNumber(phoneNumber: string): string {
    // Remover caracteres especiales y espacios
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Si empieza con 54 (Argentina), mantenerlo
    if (cleaned.startsWith('54')) {
      return cleaned
    }
    
    // Si no, agregar código de país (Argentina por defecto)
    return `54${cleaned}`
  }

  // Extraer texto del mensaje
  extractMessageText(message: WhatsAppMessage): string {
    if (message.type === 'text' && message.text) {
      return message.text.body
    }
    return ''
  }

  // Verificar si el mensaje es una imagen
  isImageMessage(message: WhatsAppMessage): boolean {
    return message.type === 'image' && !!message.image
  }

  // Descargar imagen de WhatsApp
  async downloadImage(mediaId: string): Promise<Buffer | null> {
    try {
      // Primero obtener la URL del archivo
      const mediaResponse = await this.client.get(`/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      const mediaUrl = mediaResponse.data.url
      
      // Descargar el archivo
      const imageResponse = await this.client.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      })

      return Buffer.from(imageResponse.data)
    } catch (error) {
      console.error('Error downloading image:', error)
      return null
    }
  }

  // Verificar si el mensaje es de un cliente
  isFromCustomer(message: WhatsAppMessage): boolean {
    return !!message.from
  }

  // Obtener número del cliente
  getCustomerNumber(message: WhatsAppMessage): string {
    return message.from
  }

  // Procesar webhook de WhatsApp
  processWebhook(webhookData: WhatsAppWebhook): Array<{
    phoneNumberId: string
    message: WhatsAppMessage
    customerName?: string
  }> {
    const messages: Array<{
      phoneNumberId: string
      message: WhatsAppMessage
      customerName?: string
    }> = []

    webhookData.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages' && change.value.messages) {
          const phoneNumberId = change.value.metadata.phone_number_id
          
          change.value.messages.forEach(message => {
            // Obtener nombre del contacto si está disponible
            let customerName = undefined
            if (change.value.contacts) {
              const contact = change.value.contacts.find(c => c.wa_id === message.from)
              customerName = contact?.profile.name
            }

            messages.push({
              phoneNumberId,
              message,
              customerName
            })
          })
        }
      })
    })

    return messages
  }
}