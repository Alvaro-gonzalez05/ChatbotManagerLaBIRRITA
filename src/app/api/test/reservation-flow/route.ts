import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { step } = await request.json()

    const customerNumber = "5492616977056"
    const businessId = "f2a24619-5016-490c-9dc9-dd08fd6549b3"

    let testMessage = ""
    let expectedResponse = ""

    switch(step) {
      case 1:
        testMessage = "Hola! Quiero hacer una reserva para el viernes para 4 personas para cenar"
        expectedResponse = "Debería mostrar las advertencias y pedir seña"
        break
      case 2:
        testMessage = "Mi nombre es Álvaro González"
        expectedResponse = "Debería confirmar datos y mostrar alias para transferencia"
        break
      case 3:
        testMessage = "Listo, ya transferí la seña!"
        expectedResponse = "Debería confirmar la reserva"
        break
      case 4:
        // Simular análisis de imagen
        const imageAnalysis = {
          isTransferReceipt: true,
          confidence: 0.85,
          extractedData: {
            amount: 4000,
            transferId: "123456789",
            timestamp: new Date().toISOString()
          },
          rawImageSize: 1024000
        }
        
        return NextResponse.json({
          step: 4,
          message: "Simulando imagen de comprobante",
          imageAnalysis,
          description: "Este es el objeto que se enviaría al bot cuando detecta una imagen"
        })
      default:
        testMessage = "Test de reservas - paso no válido"
    }

    return NextResponse.json({
      step,
      customerNumber,
      businessId,
      testMessage,
      expectedResponse,
      nextSteps: [
        "1. Solicitar reserva inicial",
        "2. Proporcionar nombre", 
        "3. Enviar confirmación de transferencia",
        "4. Ver análisis de imagen"
      ]
    })

  } catch (error) {
    console.error('Error in reservation test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
