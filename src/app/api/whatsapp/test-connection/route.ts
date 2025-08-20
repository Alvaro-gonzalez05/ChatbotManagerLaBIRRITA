import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/services/whatsappService'

const whatsappService = new WhatsAppService()

// Test WhatsApp Business API connection
export async function GET(request: NextRequest) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '793528520499781'
    
    console.log('Testing WhatsApp Business API connection...')
    console.log('Phone Number ID:', phoneNumberId)
    
    // Test getting business profile
    const profile = await whatsappService.getBusinessProfile(phoneNumberId)
    
    console.log('Business profile retrieved:', profile)
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business API connection successful',
      profile,
      phoneNumberId
    })

  } catch (error: any) {
    console.error('WhatsApp connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'WhatsApp Business API connection failed',
      details: error.message,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '793528520499781'
    }, { status: 500 })
  }
}

// Test sending a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message } = body
    
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number (to) and message are required' },
        { status: 400 }
      )
    }
    
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '793528520499781'
    
    console.log(`Sending test message to ${to}: "${message}"`)
    
    const result = await whatsappService.sendTextMessage(phoneNumberId, to, message)
    
    console.log('Message sent successfully:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
      result
    })

  } catch (error: any) {
    console.error('Error sending test message:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send test message',
      details: error.message
    }, { status: 500 })
  }
}