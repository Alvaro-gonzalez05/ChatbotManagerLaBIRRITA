'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Trash2,
  AlertCircle,
  Copy,
  ExternalLink,
  Link,
  Key
} from 'lucide-react'
import { toast } from 'sonner'

interface WhatsAppConfig {
  phoneNumberId: string
  phoneNumber: string
  verifiedName: string
  status: 'connected' | 'disconnected'
}

export default function WhatsAppSetupPage() {
  const { business } = useAuth()
  const [loading, setLoading] = useState(false)
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null)
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')

  useEffect(() => {
    if (business?.id) {
      checkWhatsAppConfig()
    }
  }, [business?.id])

  const checkWhatsAppConfig = async () => {
    if (!business?.id) return

    try {
      const response = await fetch(`/api/whatsapp/setup?business=${business.id}`)
      const data = await response.json()
      
      if (data.success && data.connected) {
        setWhatsappConfig({
          phoneNumberId: data.phoneNumberId,
          phoneNumber: data.phoneNumber,
          verifiedName: data.verifiedName,
          status: data.status
        })
      } else {
        setWhatsappConfig(null)
      }
    } catch (error) {
      console.error('Error checking WhatsApp config:', error)
      setWhatsappConfig(null)
    }
  }

  const setupWhatsApp = async () => {
    if (!business?.id) {
      toast.error('No hay negocio seleccionado')
      return
    }

    if (!phoneNumberId) {
      toast.error('Phone Number ID es requerido')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business.id,
          phoneNumberId: phoneNumberId
        })
      })

      const data = await response.json()

      if (data.success) {
        setWhatsappConfig({
          phoneNumberId: data.phoneNumberId,
          phoneNumber: data.phoneNumber,
          verifiedName: data.verifiedName,
          status: data.status
        })
        toast.success('WhatsApp Business API configurado exitosamente')
      } else {
        toast.error('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error setting up WhatsApp:', error)
      toast.error('Error configurando WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  const deleteWhatsAppConfig = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar la configuración de WhatsApp?')) {
      return
    }

    if (!business?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/whatsapp/setup?business=${business.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setWhatsappConfig(null)
        setPhoneNumberId('')
        toast.success('Configuración eliminada')
      } else {
        toast.error('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting config:', error)
      toast.error('Error eliminando configuración')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  const testBot = () => {
    window.open('/dashboard/bot', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-green-600" />
            Configuración WhatsApp Business API
          </h1>
          <p className="text-muted-foreground">
            Configura tu bot usando la API oficial de WhatsApp Business
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkWhatsAppConfig} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar Estado
          </Button>
          <Button onClick={testBot}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Probar Bot
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Configuración de WhatsApp Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WhatsApp Status */}
            {whatsappConfig && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Estado de WhatsApp</span>
                  <Badge variant={whatsappConfig.status === 'connected' ? "default" : "secondary"}>
                    {whatsappConfig.status === 'connected' ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {whatsappConfig.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Número:</strong> {whatsappConfig.phoneNumber}</p>
                  <p><strong>Nombre Verificado:</strong> {whatsappConfig.verifiedName}</p>
                  <p><strong>Phone Number ID:</strong> {whatsappConfig.phoneNumberId}</p>
                </div>
                {whatsappConfig.status === 'connected' && (
                  <div className="mt-3 flex gap-2">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={deleteWhatsAppConfig}
                      disabled={loading}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ID del número de teléfono desde Meta Business Manager
              </p>
            </div>

            <Button 
              onClick={setupWhatsApp} 
              disabled={loading || !business?.id || !phoneNumberId}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link className="mr-2 h-4 w-4" />
              )}
              {whatsappConfig ? 'Actualizar Configuración' : 'Configurar WhatsApp Business'}
            </Button>
          </CardContent>
        </Card>

        {/* Setup Instructions Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configuración Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                <h3 className="font-medium mb-2">Configuración de Meta Business</h3>
              </div>
              
              <div className="text-sm space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Pasos para configurar:</h4>
                  <ol className="space-y-1">
                    <li>1. Ve a <a href="https://business.facebook.com" target="_blank" className="text-blue-600 hover:underline">Meta Business Manager</a></li>
                    <li>2. Crea una aplicación de WhatsApp Business</li>
                    <li>3. Obtén tu Phone Number ID</li>
                    <li>4. Genera un Access Token permanente</li>
                    <li>5. Configura el webhook en Meta</li>
                  </ol>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2">Variables de entorno necesarias:</h4>
                  <ul className="space-y-1 font-mono text-xs">
                    <li>WHATSAPP_ACCESS_TOKEN</li>
                    <li>WHATSAPP_VERIFY_TOKEN</li>
                    <li>WHATSAPP_API_VERSION (opcional)</li>
                  </ul>
                </div>

                {whatsappConfig && (
                  <div className="p-3 bg-green-100 rounded-lg">
                    <h4 className="font-medium mb-2 text-green-800">✅ WhatsApp Configurado</h4>
                    <p className="text-sm text-green-700">
                      Tu bot está listo para recibir mensajes en {whatsappConfig.phoneNumber}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/business-management-api/get-started', '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Documentación
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Configuración del Webhook
            </h3>
            <div className="text-xs space-y-2">
              <div>
                <strong>URL:</strong>
                <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs break-all">
                  {process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/whatsapp
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/whatsapp`)}
                  className="h-6 px-2 mt-1"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <div>
                <strong>Verify Token:</strong>
                <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                  mi_token_verificacion_seguro
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">🤖 Funcionalidades del Bot</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Reconocimiento automático de nombres</li>
              <li>• Sistema de reservas inteligente</li>
              <li>• Consulta de puntos de fidelidad</li>
              <li>• Información de horarios y ubicación</li>
              <li>• Memoria de conversación</li>
              <li>• Respuestas con IA personalizada</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">📱 Cómo Probar</h3>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Configura tu Phone Number ID</li>
              <li>2. Verifica la configuración</li>
              <li>3. Envía mensaje al número de WhatsApp</li>
              <li>4. Prueba: "Hola, me llamo Juan"</li>
              <li>5. Prueba: "Quiero una reserva"</li>
              <li>6. Prueba: "¿Cuántos puntos tengo?"</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}