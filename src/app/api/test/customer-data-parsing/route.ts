import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messageText } = await request.json()

    if (!messageText) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 })
    }

    // Simular la función de detección de datos
    const detectedData: any = {}

    // Detectar email
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    const emailMatch = messageText.match(emailPattern)
    if (emailMatch) {
      detectedData.email = emailMatch[0]
    }

    // Detectar fecha de cumpleaños (varios formatos)
    const birthdayPatterns = [
      { pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, format: 'DD/MM/YYYY' },
      { pattern: /(\d{1,2})-(\d{1,2})-(\d{2,4})/, format: 'DD-MM-YYYY' },
      { pattern: /(\d{1,2})\s+de\s+(\w+)/i, format: 'DD de Mes' },
      { pattern: /(\d{1,2})\s+(\w+)/i, format: 'DD Mes' }
    ]

    for (const { pattern, format } of birthdayPatterns) {
      const match = messageText.match(pattern)
      if (match) {
        let birthday = null
        
        if (format.includes('/') || format.includes('-')) {
          // Formato DD/MM/YYYY o DD-MM-YYYY
          const day = parseInt(match[1])
          const month = parseInt(match[2])
          let year = parseInt(match[3])
          
          // Validar rangos
          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            // Si el año es de 2 dígitos, asumir 19XX o 20XX
            if (year < 100) {
              year = year > 30 ? 1900 + year : 2000 + year
            }
            
            // Crear fecha en formato ISO
            try {
              const date = new Date(year, month - 1, day)
              if (date.getDate() === day && date.getMonth() === month - 1) {
                birthday = date.toISOString().split('T')[0]
                detectedData.birthday = birthday
                detectedData.birthdayFormat = format
                break
              }
            } catch (e) {
              console.log('Invalid date format')
            }
          }
        }
      }
    }

    // Detectar nombre (si el mensaje contiene solo palabras y no es muy largo)
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,30}$/
    if (namePattern.test(messageText.trim())) {
      // Verificar que no contenga números ni caracteres especiales
      if (!/\d|[@#$%^&*(),.?":{}|<>]/.test(messageText.trim())) {
        detectedData.name = messageText.trim()
      }
    }

    return NextResponse.json({
      messageText,
      detectedData,
      hasData: Object.keys(detectedData).length > 0
    })

  } catch (error) {
    console.error('Error testing customer data parsing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
