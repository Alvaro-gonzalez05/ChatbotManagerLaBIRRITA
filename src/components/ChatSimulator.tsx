'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  isTyping?: boolean
}

interface BotPersonality {
  bot_name: string
  tone: string
  personality_description: string
  welcome_message: string
  capabilities: string[]
}

interface BusinessInfo {
  name: string
  description: string
}

interface ChatSimulatorProps {
  botPersonality: BotPersonality
  businessInfo: BusinessInfo
}

export default function ChatSimulator({ botPersonality, businessInfo }: ChatSimulatorProps) {
  const { business } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isPhoneSet, setIsPhoneSet] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize with phone number prompt or welcome message
  useEffect(() => {
    if (!isPhoneSet && messages.length === 0) {
      setMessages([{
        id: '1',
        text: 'Para comenzar la simulación, por favor ingresa tu número de teléfono (ej: +54 261 123 4567)',
        sender: 'bot',
        timestamp: new Date()
      }])
    } else if (isPhoneSet && botPersonality.welcome_message) {
      // Clear messages and add welcome message when phone is set
      if (messages.length === 1 && messages[0].text.includes('número de teléfono')) {
        setMessages([{
          id: '2',
          text: botPersonality.welcome_message,
          sender: 'bot',
          timestamp: new Date()
        }])
      }
    }
  }, [botPersonality.welcome_message, messages.length, isPhoneSet])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // If phone number is not set, check if this message contains a phone number
    if (!isPhoneSet) {
      const phoneRegex = /(\+?54[\s-]?)?(0?26[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}|[0-9]{3}[\s-]?[0-9]{3}[\s-]?[0-9]{4})/
      if (phoneRegex.test(inputMessage)) {
        let extractedPhone = inputMessage.match(phoneRegex)?.[0] || ''
        // Normalize phone number
        extractedPhone = extractedPhone.replace(/[\s-]/g, '')
        if (!extractedPhone.startsWith('54')) {
          extractedPhone = '54' + extractedPhone.replace(/^0/, '')
        }
        
        setPhoneNumber(extractedPhone)
        setIsPhoneSet(true)
        
        const userMessage: Message = {
          id: Date.now().toString(),
          text: inputMessage,
          sender: 'user',
          timestamp: new Date()
        }

        const confirmMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Perfecto! Tu número ${extractedPhone} ha sido registrado. Ahora puedes comenzar a chatear.`,
          sender: 'bot',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage, confirmMessage])
        setInputMessage('')
        return
      } else {
        const userMessage: Message = {
          id: Date.now().toString(),
          text: inputMessage,
          sender: 'user',
          timestamp: new Date()
        }

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Por favor ingresa un número de teléfono válido (ej: +54 261 123 4567 o 0261 123 4567)',
          sender: 'bot',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage, errorMessage])
        setInputMessage('')
        return
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    // Add user message
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      text: 'Escribiendo...',
      sender: 'bot',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      // Call the AI service
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/whatsapp/test/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber || '542616000001', // Use actual phone number
          message: inputMessage,
          businessId: business?.id || 'f2a24619-5016-490c-9dc9-dd08fd6549b3'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Remove typing indicator and add bot response
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.botResponse || 'Lo siento, hubo un problema procesando tu mensaje.',
          sender: 'bot',
          timestamp: new Date()
        }
        
        setMessages(prev => [...prev, botResponse])
      } else {
        throw new Error('Failed to get bot response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Remove typing indicator and add error message
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'))
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, hubo un error de conexión. ¿Puedes intentar de nuevo?',
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setPhoneNumber('')
    setIsPhoneSet(false)
    setMessages([{
      id: '1',
      text: 'Para comenzar la simulación, por favor ingresa tu número de teléfono (ej: +54 261 123 4567)',
      sender: 'bot',
      timestamp: new Date()
    }])
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <div>
              <CardTitle className="text-lg">Chat Simulador</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prueba cómo responde tu bot
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat}>
            Limpiar
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            {botPersonality.bot_name || 'Bot'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {businessInfo.name}
          </Badge>
          {isPhoneSet && (
            <Badge variant="outline" className="text-xs">
              📱 {phoneNumber}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className={`rounded-full p-2 ${
                    message.sender === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">
                      {message.isTyping ? (
                        <span className="animate-pulse">{message.text}</span>
                      ) : (
                        message.text
                      )}
                    </p>
                    <p className={`text-xs mt-1 opacity-70 ${
                      message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe tu mensaje aquí..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Presiona Enter para enviar • 
            {!isPhoneSet 
              ? "Primero ingresa tu número de teléfono" 
              : 'Prueba: "Hola", "me llamo Juan", "quiero reservar para mañana a las 21hs al baile"'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}