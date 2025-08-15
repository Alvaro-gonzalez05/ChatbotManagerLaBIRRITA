import axios, { AxiosInstance } from 'axios'
import * as qr from 'qr-image'

export interface EvolutionInstance {
  instanceName: string
  status: 'open' | 'close' | 'connecting'
  qrcode?: string
  number?: string
  profileName?: string
  profilePictureUrl?: string
}

export interface WhatsAppMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: {
      text: string
    }
  }
  messageTimestamp: number
  pushName?: string
}

export class EvolutionApiService {
  private client: AxiosInstance
  private baseUrl: string
  private apiKey: string
  private webhookUrl: string

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
    this.apiKey = process.env.EVOLUTION_API_KEY || 'your-api-key'
    this.webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3001'
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async createInstance(instanceName: string): Promise<EvolutionInstance> {
    try {
      const response = await this.client.post(`/instance/create`, {
        instanceName,
        qrcode: true,
        number: null,
        integration: 'WHATSAPP-BAILEYS',
        webhook: `${this.webhookUrl}/webhook/whatsapp`,
        webhook_by_events: false,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONTACTS_SET',
          'CONTACTS_UPSERT',
          'CONTACTS_UPDATE',
          'PRESENCE_UPDATE',
          'CHATS_SET',
          'CHATS_UPSERT',
          'CHATS_UPDATE',
          'CHATS_DELETE',
          'GROUPS_UPSERT',
          'GROUP_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE',
          'CONNECTION_UPDATE'
        ]
      })

      return {
        instanceName,
        status: 'connecting',
        ...response.data
      }
    } catch (error: any) {
      console.error('Error creating Evolution API instance:', error.response?.data || error.message)
      throw new Error('Failed to create WhatsApp instance')
    }
  }

  async getInstanceStatus(instanceName: string): Promise<EvolutionInstance> {
    try {
      const response = await this.client.get(`/instance/connectionState/${instanceName}`)
      return {
        instanceName,
        status: response.data.state === 'open' ? 'open' : 'close',
        ...response.data
      }
    } catch (error: any) {
      console.error('Error getting instance status:', error.response?.data || error.message)
      throw new Error('Failed to get instance status')
    }
  }

  async deleteInstance(instanceName: string): Promise<boolean> {
    try {
      await this.client.delete(`/instance/delete/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Error deleting instance:', error.response?.data || error.message)
      return false
    }
  }

  async sendMessage(instanceName: string, number: string, message: string): Promise<any> {
    try {
      // Clean the phone number (remove special characters, spaces, etc.)
      const cleanNumber = number.replace(/\D/g, '')
      const formattedNumber = cleanNumber.startsWith('54') ? cleanNumber : `54${cleanNumber}`

      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: `${formattedNumber}@s.whatsapp.net`,
        textMessage: {
          text: message
        }
      })

      return response.data
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message)
      throw new Error('Failed to send WhatsApp message')
    }
  }

  async generateQRCode(text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const qrStream = qr.image(text, { type: 'png', size: 5 })
      const chunks: Buffer[] = []
      
      qrStream.on('data', chunk => chunks.push(chunk))
      qrStream.on('end', () => resolve(Buffer.concat(chunks)))
      qrStream.on('error', reject)
    })
  }

  async getQRCode(instanceName: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/instance/connect/${instanceName}`)
      
      if (response.data && response.data.code) {
        // Generate base64 QR code
        const qrBuffer = await this.generateQRCode(response.data.code)
        return `data:image/png;base64,${qrBuffer.toString('base64')}`
      }
      
      return null
    } catch (error: any) {
      console.error('Error getting QR code:', error.response?.data || error.message)
      return null
    }
  }

  async restartInstance(instanceName: string): Promise<boolean> {
    try {
      await this.client.put(`/instance/restart/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Error restarting instance:', error.response?.data || error.message)
      return false
    }
  }

  async logoutInstance(instanceName: string): Promise<boolean> {
    try {
      await this.client.delete(`/instance/logout/${instanceName}`)
      return true
    } catch (error: any) {
      console.error('Error logging out instance:', error.response?.data || error.message)
      return false
    }
  }

  async getInstanceInfo(instanceName: string): Promise<any> {
    try {
      const response = await this.client.get(`/instance/fetchInstances`)
      const instances = response.data || []
      return instances.find((inst: any) => inst.instance.instanceName === instanceName)
    } catch (error: any) {
      console.error('Error getting instance info:', error.response?.data || error.message)
      return null
    }
  }

  extractMessageText(message: WhatsAppMessage): string {
    if (message.message.conversation) {
      return message.message.conversation
    }
    
    if (message.message.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text
    }
    
    return ''
  }

  isFromCustomer(message: WhatsAppMessage): boolean {
    return !message.key.fromMe
  }

  getCustomerNumber(message: WhatsAppMessage): string {
    return message.key.remoteJid.replace('@s.whatsapp.net', '')
  }
}