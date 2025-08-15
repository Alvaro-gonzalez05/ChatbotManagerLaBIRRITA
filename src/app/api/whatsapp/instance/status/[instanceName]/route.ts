import { NextRequest, NextResponse } from 'next/server'
import { EvolutionApiService } from '@/services/evolutionApi'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

const evolutionApi = new EvolutionApiService()
const whatsappBusinessApi = new WhatsAppBusinessApiService()

export async function GET(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const { instanceName } = params
    
    // Check if WhatsApp Business API is configured
    if (whatsappBusinessApi.isConfigured()) {
      try {
        const profile = await whatsappBusinessApi.getProfile()
        return NextResponse.json({
          instanceName,
          status: 'open',
          number: profile.display_phone_number || 'Unknown',
          profileName: profile.verified_name || 'WhatsApp Business'
        })
      } catch (profileError) {
        return NextResponse.json({
          instanceName,
          status: 'close',
          error: 'WhatsApp Business API not accessible'
        })
      }
    } else {
      // Fallback to Evolution API if WhatsApp Business API is not configured
      const status = await evolutionApi.getInstanceStatus(instanceName)
      return NextResponse.json(status)
    }
  } catch (error: any) {
    console.error('Error getting status:', error)
    return NextResponse.json({ error: 'Failed to get instance status' }, { status: 500 })
  }
}