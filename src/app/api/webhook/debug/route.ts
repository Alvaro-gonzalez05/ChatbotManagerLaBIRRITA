import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to see all webhook data
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook debug endpoint is active',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== WEBHOOK DEBUG ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('=== END DEBUG ===')
    
    return NextResponse.json({
      success: true,
      received: true,
      timestamp: new Date().toISOString(),
      body: body
    })
    
  } catch (error) {
    console.error('Debug webhook error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}