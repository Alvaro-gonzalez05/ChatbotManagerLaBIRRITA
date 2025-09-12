'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface MercadoPagoPaymentProps {
  amount: number
  description: string
  customerPhone: string
  onPaymentSuccess?: (paymentData: any) => void
  onPaymentError?: (error: any) => void
}

export default function MercadoPagoPayment({
  amount,
  description,
  customerPhone,
  onPaymentSuccess,
  onPaymentError
}: MercadoPagoPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: `${customerPhone}@labirrita.com.ar`,
    identificationType: 'DNI',
    identificationNumber: ''
  })
  const [mpLoaded, setMpLoaded] = useState(false)

  // Cargar MercadoPago SDK v2
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://sdk.mercadopago.com/js/v2'
    script.async = true
    script.onload = () => {
      setMpLoaded(true)
      console.log('✅ MercadoPago SDK v2 loaded')
    }
    script.onerror = () => {
      console.error('❌ Error loading MercadoPago SDK')
      onPaymentError?.({ message: 'Error cargando SDK de MercadoPago' })
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [onPaymentError])

  const handleCreatePreference = async () => {
    if (!customerData.firstName || !customerData.lastName || !customerData.identificationNumber) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)

    try {
      console.log('🔄 Creating payment preference with customer data:', customerData)

      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          description,
          customerPhone,
          customerInfo: {
            name: customerData.firstName,
            lastName: customerData.lastName,
            email: customerData.email,
            phone: customerPhone,
            identification: {
              type: customerData.identificationType,
              number: customerData.identificationNumber
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error creando preferencia de pago')
      }

      console.log('✅ Payment preference created:', data)

      // Redirigir a MercadoPago con la preferencia creada
      if (data.init_point) {
        window.open(data.init_point, '_blank')
        onPaymentSuccess?.(data)
      } else {
        throw new Error('No se recibió el link de pago')
      }

    } catch (error: any) {
      console.error('❌ Error creating payment:', error)
      onPaymentError?.(error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🍺 Seña para Reserva
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-green-800">Total a pagar:</span>
            <span className="text-xl font-bold text-green-600">${amount} ARS</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            📋 Información del Cliente (Requerido por MercadoPago)
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={customerData.firstName}
                onChange={(e) => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Ej: Juan"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={customerData.lastName}
                onChange={(e) => setCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Ej: Pérez"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={customerData.email}
              onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="tu@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="identificationType">Tipo Doc.</Label>
              <select
                id="identificationType"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customerData.identificationType}
                onChange={(e) => setCustomerData(prev => ({ ...prev, identificationType: e.target.value }))}
              >
                <option value="DNI">DNI</option>
                <option value="CI">CI</option>
                <option value="LC">LC</option>
                <option value="LE">LE</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identificationNumber">Número *</Label>
              <Input
                id="identificationNumber"
                value={customerData.identificationNumber}
                onChange={(e) => setCustomerData(prev => ({ ...prev, identificationNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="12345678"
                maxLength={8}
                required
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Button
            onClick={handleCreatePreference}
            disabled={loading || !mpLoaded}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Procesando...
              </div>
            ) : (
              `💳 Pagar $${amount} con MercadoPago`
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center">
            🔒 Pago seguro procesado por MercadoPago
            <br />
            Tu información está protegida con certificados SSL/TLS
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
