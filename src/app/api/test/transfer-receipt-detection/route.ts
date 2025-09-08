import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messageText, customerNumber = "5492616977056" } = await request.json()

    if (!messageText) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 })
    }

    // Simular la función de detección de comprobantes
    const lowerInput = messageText.toLowerCase()
    
    // Keywords that indicate a transfer receipt
    const receiptKeywords = [
      'comprobante', 'transferencia', 'tranferí', 'transferi', 'envié', 'envie', 
      'pagué', 'pague', 'mandé', 'mande', 'listo', 'hecho', 'transferido',
      'enviado', 'pagado', 'seña', 'señé', 'sene'
    ]
    
    // Transfer-related patterns
    const transferPatterns = [
      /transferí/i, /transferi/i, /transfirí/i, /transfiri/i,
      /envié/i, /envie/i, /mandé/i, /mande/i,
      /pagué/i, /pague/i, /señé/i, /sene/i,
      /ya está/i, /ya esta/i, /listo/i, /hecho/i
    ]
    
    // Check for keywords
    const hasReceiptKeyword = receiptKeywords.some(keyword => lowerInput.includes(keyword))
    
    // Check for patterns
    const hasTransferPattern = transferPatterns.some(pattern => pattern.test(messageText))
    
    // Check for monetary amounts (indicates payment)
    const hasAmount = /\$\d+|(\d+)\s*(pesos?|usd|dolares?)/i.test(messageText)
    
    const isTransferReceipt = hasReceiptKeyword || hasTransferPattern || (hasAmount && lowerInput.includes('transfer'))

    return NextResponse.json({
      messageText,
      isTransferReceipt,
      details: {
        hasReceiptKeyword,
        hasTransferPattern,
        hasAmount,
        matchedKeywords: receiptKeywords.filter(keyword => lowerInput.includes(keyword)),
        matchedPatterns: transferPatterns.filter(pattern => pattern.test(messageText))
      }
    })

  } catch (error) {
    console.error('Error testing transfer receipt detection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
