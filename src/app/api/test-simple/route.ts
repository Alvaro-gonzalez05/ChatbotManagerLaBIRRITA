import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Bot test endpoint working',
    message: 'Use POST to test the bot'
  })
}
