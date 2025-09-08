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
   * Crear link de pago con MercadoPago
   */
  async crearLinkDePago(monto: number, descripcion: string, referencia: string): Promise<string> {
    try {
      console.log(`🔗 Creando link de pago: $${monto} - ${descripcion}`)
      
      const preferenceRequest = {
        items: [
          {
            id: 'seña-reserva',
            title: descripcion,
            quantity: 1,
            unit_price: monto,
            currency_id: 'ARS'
          }
        ],
        external_reference: referencia,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhook/mercadopago`
      }
      
      const preferenceResponse = await preference.create({ body: preferenceRequest })
      
      if (preferenceResponse.init_point) {
        console.log(`✅ Link de pago creado: ${preferenceResponse.init_point}`)
        return preferenceResponse.init_point
      } else {
        throw new Error('No se pudo obtener el link de pago')
      }
      
    } catch (error: any) {
      console.error('Error creando link de pago:', error)
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
