import { NextRequest, NextResponse } from 'next/server'
import MercadoPagoService from '@/services/mercadoPagoService'

const mercadoPagoService = new MercadoPagoService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description, customerPhone, customerInfo } = body

    console.log('📋 Creating MercadoPago preference with data:', {
      amount,
      description,
      customerPhone,
      customerInfo
    })

    // Validar datos requeridos
    if (!amount || !description || !customerPhone) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: amount, description, customerPhone' },
        { status: 400 }
      )
    }

    if (!customerInfo?.name || !customerInfo?.lastName || !customerInfo?.identification?.number) {
      return NextResponse.json(
        { error: 'Información del cliente incompleta. Se requiere: nombre, apellido, número de identificación' },
        { status: 400 }
      )
    }

    // Crear preference con los datos completos
    const paymentUrl = await mercadoPagoService.crearLinkDePago(
      amount,
      description,
      customerPhone,
      customerInfo
    )

    console.log('✅ Payment URL created:', paymentUrl)

    return NextResponse.json({
      success: true,
      init_point: paymentUrl,
      customer_info: customerInfo
    })

  } catch (error: any) {
    console.error('❌ Error creating MercadoPago preference:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message,
        details: error.response?.data || null
      },
      { status: 500 }
    )
  }
}
