import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

// Configurar MercadoPago con las credenciales
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
})

const payment = new Payment(client)
const preference = new Preference(client)

export interface PaymentInfo {
  id: string
  status: string
  amount: number
  currency: string
  description?: string
  external_reference?: string
  date_created: string
  date_approved?: string
  payer: {
    email?: string
    identification?: {
      type?: string
      number?: string
    }
  }
  payment_method: {
    id: string
    type: string
  }
}

export class MercadoPagoService {
  
  /**
   * Buscar pago por ID de pago
   */
  async buscarPagoPorId(paymentId: string): Promise<PaymentInfo | null> {
    try {
      console.log(`🔍 Buscando pago en MercadoPago por ID: ${paymentId}`)
      
      const paymentResponse = await payment.get({ id: paymentId })
      
      if (paymentResponse && paymentResponse.id) {
        console.log(`✅ Pago encontrado: ${paymentResponse.id} - Estado: ${paymentResponse.status}`)
        
        return {
          id: paymentResponse.id?.toString() || '',
          status: paymentResponse.status || 'unknown',
          amount: paymentResponse.transaction_amount || 0,
          currency: paymentResponse.currency_id || 'ARS',
          description: paymentResponse.description,
          external_reference: paymentResponse.external_reference,
          date_created: paymentResponse.date_created || '',
          date_approved: paymentResponse.date_approved,
          payer: {
            email: paymentResponse.payer?.email,
            identification: {
              type: paymentResponse.payer?.identification?.type,
              number: paymentResponse.payer?.identification?.number
            }
          },
          payment_method: {
            id: paymentResponse.payment_method_id || '',
            type: paymentResponse.payment_type_id || ''
          }
        }
      }
      
      console.log(`❌ Pago no encontrado con ID: ${paymentId}`)
      return null
      
    } catch (error: any) {
      console.error('Error buscando pago en MercadoPago:', error)
      
      // Si es error 404, el pago no existe
      if (error.status === 404) {
        console.log(`❌ Pago no existe: ${paymentId}`)
        return null
      }
      
      throw error
    }
  }

  /**
   * Buscar pagos por external_reference
   */
  async buscarPagosPorReferencia(reference: string): Promise<PaymentInfo[]> {
    try {
      console.log(`🔍 Buscando pagos por referencia externa: ${reference}`)
      
      const searchResponse = await payment.search({
        options: {
          external_reference: reference
        }
      })
      
      const results = searchResponse.results || []
      console.log(`📊 Encontrados ${results.length} pagos con referencia: ${reference}`)
      
      return results.map(p => ({
        id: p.id?.toString() || '',
        status: p.status || 'unknown',
        amount: p.transaction_amount || 0,
        currency: p.currency_id || 'ARS',
        description: p.description,
        external_reference: p.external_reference,
        date_created: p.date_created || '',
        date_approved: p.date_approved,
        payer: {
          email: p.payer?.email,
          identification: {
            type: p.payer?.identification?.type,
            number: p.payer?.identification?.number
          }
        },
        payment_method: {
          id: p.payment_method_id || '',
          type: p.payment_type_id || ''
        }
      }))
      
    } catch (error: any) {
      console.error('Error buscando pagos por referencia:', error)
      throw error
    }
  }

  /**
   * Verificar si un pago está aprobado y por el monto correcto
   */
  verificarPago(paymentInfo: PaymentInfo, montoEsperado: number, tolerancia: number = 0): boolean {
    // El pago debe estar aprobado
    if (paymentInfo.status !== 'approved') {
      console.log(`❌ Pago ${paymentInfo.id} no está aprobado. Estado: ${paymentInfo.status}`)
      return false
    }

    // Verificar monto (con tolerancia)
    const diferencia = Math.abs(paymentInfo.amount - montoEsperado)
    if (diferencia > tolerancia) {
      console.log(`❌ Pago ${paymentInfo.id} monto incorrecto. Esperado: $${montoEsperado}, Recibido: $${paymentInfo.amount}`)
      return false
    }

    console.log(`✅ Pago ${paymentInfo.id} verificado correctamente: $${paymentInfo.amount}`)
    return true
  }

  /**
   * Formatear información del pago para mostrar al usuario
   */
  formatearInfoPago(paymentInfo: PaymentInfo): string {
    const estado = this.traducirEstado(paymentInfo.status)
    const fecha = new Date(paymentInfo.date_created).toLocaleDateString('es-AR')
    
    return `💳 **Pago #${paymentInfo.id}**
💰 Monto: $${paymentInfo.amount} ${paymentInfo.currency}
📅 Fecha: ${fecha}
✅ Estado: ${estado}
🏦 Método: ${paymentInfo.payment_method.type}`
  }

  /**
   * Crear link de pago con MercadoPago (Compliant con requerimientos de MP)
   */
  async crearLinkDePago(
    monto: number, 
    descripcion: string, 
    referencia: string,
    customerInfo?: {
      name?: string
      lastName?: string
      email?: string
      phone?: string
      identification?: {
        type: string
        number: string
      }
    }
  ): Promise<string> {
    try {
      console.log(`🔗 Creando link de pago: $${monto} - ${descripcion}`)
      
      // Parsear nombre y apellido si viene en customerInfo.name
      let firstName = customerInfo?.name || 'Cliente'
      let lastName = customerInfo?.lastName || 'Reserva'
      
      if (customerInfo?.name && !customerInfo?.lastName) {
        const nameParts = customerInfo.name.trim().split(' ')
        if (nameParts.length > 1) {
          firstName = nameParts[0]
          lastName = nameParts.slice(1).join(' ')
        }
      }

      const preferenceRequest = {
        items: [
          {
            id: 'seña-reserva',
            title: descripcion,
            description: `Seña para reserva en La Birrita - ${descripcion}`, // Campo description requerido
            category_id: 'food', // Campo category_id requerido - categoría para restaurante
            quantity: 1,
            unit_price: monto,
            currency_id: 'ARS'
          }
        ],
        // Información del pagador (requerido para aprobación)
        payer: {
          first_name: firstName, // Campo first_name requerido
          last_name: lastName,   // Campo last_name requerido
          email: customerInfo?.email || `${referencia}@labirrita.com.ar`,
          phone: {
            area_code: '54',
            number: customerInfo?.phone || referencia
          },
          identification: customerInfo?.identification || {
            type: 'DNI',
            number: '00000000'
          },
          address: {
            street_name: 'Av. Principal',
            street_number: '123',
            zip_code: '1000'
          }
        },
        // Referencias
        external_reference: referencia,
        
        // URLs de callback mejoradas
        back_urls: {
          success: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/reservations?payment=success`,
          failure: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/reservations?payment=failure`,
          pending: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL}/dashboard/reservations?payment=pending`
        },
        auto_return: 'approved',
        
        // URL de notificación webhook
        notification_url: `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`,
        
        // Configuración adicional para seguridad
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 1 // Solo pagos en 1 cuota para seña
        },
        
        // Metadatos adicionales para tracking
        metadata: {
          customer_phone: referencia,
          reservation_type: 'seña',
          business_name: 'La Birrita'
        },
        
        // Configuración de experiencia
        additional_info: `Reserva en La Birrita - ${descripcion}`,
        
        // Fecha de expiración (opcional)
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      }
      
      console.log('📋 Preference request:', JSON.stringify(preferenceRequest, null, 2))
      
      const preferenceResponse = await preference.create({ body: preferenceRequest })
      
      if (preferenceResponse.init_point) {
        console.log(`✅ Link de pago creado: ${preferenceResponse.init_point}`)
        console.log(`🆔 Preference ID: ${preferenceResponse.id}`)
        return preferenceResponse.init_point
      } else {
        throw new Error('No se pudo obtener el link de pago')
      }
      
    } catch (error: any) {
      console.error('Error creando link de pago:', error)
      console.error('Error details:', error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Traducir estados de MercadoPago al español
   */
  private traducirEstado(status: string): string {
    const estados: Record<string, string> = {
      'approved': '✅ Aprobado',
      'pending': '⏳ Pendiente',
      'rejected': '❌ Rechazado',
      'cancelled': '🚫 Cancelado',
      'refunded': '💸 Reembolsado',
      'charged_back': '🔄 Contracargo'
    }
    
    return estados[status] || status
  }
}

export default MercadoPagoService
