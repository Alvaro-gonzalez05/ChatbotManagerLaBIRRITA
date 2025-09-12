'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MercadoPagoPayment from '@/components/MercadoPagoPayment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PaymentPage() {
  const searchParams = useSearchParams()
  const [paymentData, setPaymentData] = useState({
    amount: parseInt(searchParams.get('amount') || '0'),
    description: searchParams.get('description') || 'Seña para reserva',
    customerPhone: searchParams.get('phone') || ''
  })

  const handlePaymentSuccess = (data: any) => {
    console.log('✅ Payment successful:', data)
    // Aquí podrías redirigir o mostrar un mensaje de éxito
    alert('✅ ¡Pago iniciado! Serás redirigido a MercadoPago para completar el pago.')
  }

  const handlePaymentError = (error: any) => {
    console.error('❌ Payment error:', error)
    alert(`❌ Error en el pago: ${error.message}`)
  }

  if (!paymentData.amount || !paymentData.customerPhone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ Error</CardTitle>
            <CardDescription>
              No se pudieron cargar los datos del pago. 
              Verifica que tengas un link válido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍺 La Birrita
          </h1>
          <p className="text-gray-600">
            Pago Seguro con MercadoPago
          </p>
        </div>

        <MercadoPagoPayment
          amount={paymentData.amount}
          description={paymentData.description}
          customerPhone={paymentData.customerPhone}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />

        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            🔒 Pago 100% seguro
          </div>
          <div className="space-y-1">
            <p>✅ Certificados SSL/TLS 1.2+</p>
            <p>✅ Datos protegidos por MercadoPago</p>
            <p>✅ PCI DSS Compliant</p>
          </div>
        </div>
      </div>
    </div>
  )
}
