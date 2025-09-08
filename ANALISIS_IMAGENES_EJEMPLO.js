// EJEMPLO: Análisis REAL de comprobantes con IA
// Este código muestra cómo implementar análisis real de imágenes

import OpenAI from 'openai'  // Para GPT Vision
// O alternativas: Google Vision API, AWS Textract, Azure OCR

export async function analyzeTransferReceiptWithAI(imageBuffer: Buffer): Promise<any> {
  try {
    // OPCIÓN 1: OpenAI GPT-4 Vision
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const base64Image = imageBuffer.toString('base64')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza esta imagen y determina si es un comprobante de transferencia bancaria.
              
              Responde en formato JSON con:
              {
                "isTransferReceipt": boolean,
                "confidence": number (0-1),
                "extractedData": {
                  "amount": number or null,
                  "transferId": string or null,
                  "timestamp": string or null,
                  "sourceBank": string or null,
                  "destinationAlias": string or null
                },
                "reasonForDecision": string
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    return JSON.parse(response.choices[0].message.content)

  } catch (error) {
    console.error('Error analyzing image with AI:', error)
    
    // FALLBACK: Análisis básico por tamaño/tipo
    return {
      isTransferReceipt: imageBuffer.length > 50000, // Si es > 50KB, probablemente es screenshot
      confidence: 0.3,
      extractedData: {
        amount: null,
        transferId: null,
        timestamp: null
      },
      reasonForDecision: "Análisis básico por tamaño de archivo"
    }
  }
}

// OPCIÓN 2: Google Vision API (OCR especializado)
export async function analyzeWithGoogleVision(imageBuffer: Buffer) {
  const vision = require('@google-cloud/vision')
  const client = new vision.ImageAnnotatorClient()
  
  const [result] = await client.textDetection({
    image: { content: imageBuffer }
  })
  
  const text = result.textAnnotations[0]?.description || ''
  
  // Buscar patrones de transferencia
  const hasTransferKeywords = /transferencia|transfer|comprobante|CBU|alias/i.test(text)
  const hasAmount = /\$\s*[\d,]+|\d+\s*pesos/i.test(text)
  const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/i.test(text)
  
  return {
    isTransferReceipt: hasTransferKeywords && (hasAmount || hasDate),
    confidence: hasTransferKeywords && hasAmount && hasDate ? 0.9 : 0.5,
    extractedData: {
      fullText: text,
      amount: text.match(/\$\s*([\d,]+)|\([\d,]+\)\s*pesos/)?.[1],
      timestamp: text.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0]
    }
  }
}

// OPCIÓN 3: AWS Textract (especializado en documentos)
export async function analyzeWithAWSTextract(imageBuffer: Buffer) {
  const AWS = require('aws-sdk')
  const textract = new AWS.Textract()
  
  const params = {
    Document: { Bytes: imageBuffer },
    FeatureTypes: ['FORMS', 'TABLES']
  }
  
  const result = await textract.analyzeDocument(params).promise()
  
  // Procesar resultados para extraer datos de transferencia
  const extractedText = result.Blocks
    .filter(block => block.BlockType === 'LINE')
    .map(block => block.Text)
    .join(' ')
  
  return {
    isTransferReceipt: /transferencia|comprobante/i.test(extractedText),
    confidence: 0.8,
    extractedData: {
      rawText: extractedText,
      structuredData: result.Blocks
    }
  }
}
